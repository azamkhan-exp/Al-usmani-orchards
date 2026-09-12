import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { hashPassword } from '@/lib/auth/crypto';
import { signMfaChallengeToken, verifyMfaChallengeToken, signPasswordResetToken, verifyPasswordResetToken } from '@/lib/auth/tokens';
import { revokeAllUserSessions } from '@/lib/auth/session';
import { generateAndSendAdminOTP, verifyAdminOTP } from '@/lib/services/otp.service';
import { recordAuditLog } from '@/lib/services/audit.service';
import { checkRateLimit } from '@/lib/auth/rate-limit';

const ADMIN_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE_MANAGER',
  'INVENTORY_MANAGER',
  'ORDER_MANAGER',
  'MARKETING_MANAGER',
  'SUPPORT_AGENT'
]);

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Rate limit: 8 requests per 15 minutes per IP
    const rateCheck = checkRateLimit(`admin_forgot_pw:${ip}`, 8, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const waitMinutes = Math.ceil((rateCheck.resetAt - Date.now()) / (60 * 1000));
      return NextResponse.json(
        { error: `Too many password reset requests. Please wait ${waitMinutes} minute(s).` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { action } = body;

    // ==========================================
    // ACTION 1: REQUEST OTP CODE
    // ==========================================
    if (action === 'REQUEST') {
      const { identifier } = body;
      if (!identifier) {
        return NextResponse.json(
          { error: 'Email or username is required.' },
          { status: 400 }
        );
      }

      const db = getDatabase();
      const cleanIdentifier = identifier.trim().toLowerCase();
      const user = await db.prepare(`
        SELECT id, username, email, role, status
        FROM users
        WHERE LOWER(email) = ? OR LOWER(username) = ?
      `).get(cleanIdentifier, cleanIdentifier) as any;

      // Anti-enumeration: Return generic message if user doesn't exist or isn't admin
      if (!user || !ADMIN_ROLES.has(user.role) || user.status !== 'ACTIVE') {
        return NextResponse.json({
          success: true,
          message: 'If an active administrative account matches the provided identifier, a verification code has been dispatched to the security phone.'
        });
      }

      // Generate & send OTP to verified security phone
      const otpResult = await generateAndSendAdminOTP(user.id, 'PASSWORD_RESET');
      if (!otpResult.success) {
        return NextResponse.json(
          {
            error: otpResult.error || 'Failed to dispatch security code. Please try again later.',
            cooldown_seconds: otpResult.cooldown_seconds
          },
          { status: 429 }
        );
      }

      const challengeToken = await signMfaChallengeToken(user.id, 600);

      return NextResponse.json({
        success: true,
        challenge_token: challengeToken,
        masked_phone: otpResult.masked_phone,
        cooldown_seconds: otpResult.cooldown_seconds,
        expires_in_seconds: otpResult.expires_in_seconds,
        message: `A 6-digit password reset code has been sent to ${otpResult.masked_phone}.`
      });
    }

    // ==========================================
    // ACTION 2: VERIFY OTP CODE
    // ==========================================
    if (action === 'VERIFY') {
      const { challenge_token, code } = body;
      if (!challenge_token || !code) {
        return NextResponse.json(
          { error: 'Challenge token and 6-digit verification code are required.' },
          { status: 400 }
        );
      }

      const { valid, userId } = await verifyMfaChallengeToken(challenge_token);
      if (!valid || !userId) {
        return NextResponse.json(
          { error: 'Reset session has expired or is invalid. Please start over.' },
          { status: 401 }
        );
      }

      const verifyResult = await verifyAdminOTP(userId, code, 'PASSWORD_RESET');
      if (!verifyResult.success) {
        return NextResponse.json(
          { error: verifyResult.error || 'Invalid verification code.' },
          { status: 401 }
        );
      }

      // OTP verified successfully! Generate a short-lived signed reset token (15 mins)
      const resetToken = await signPasswordResetToken(userId, 900);

      return NextResponse.json({
        success: true,
        reset_token: resetToken,
        message: 'Verification code confirmed. Please set your new password.'
      });
    }

    // ==========================================
    // ACTION 3: SET NEW PASSWORD
    // ==========================================
    if (action === 'RESET') {
      const { reset_token, new_password, confirm_password } = body;

      if (!reset_token || !new_password) {
        return NextResponse.json(
          { error: 'Reset token and new password are required.' },
          { status: 400 }
        );
      }

      if (confirm_password && new_password !== confirm_password) {
        return NextResponse.json(
          { error: 'Passwords do not match.' },
          { status: 400 }
        );
      }

      if (new_password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long and contain letters and numbers.' },
          { status: 400 }
        );
      }

      const { valid, userId } = await verifyPasswordResetToken(reset_token);
      if (!valid || !userId) {
        return NextResponse.json(
          { error: 'Password reset session has expired or is invalid. Please request a new code.' },
          { status: 401 }
        );
      }

      const db = getDatabase();
      const user = await db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(userId) as any;
      if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      // Hash password using crypto scrypt
      const newPasswordHash = hashPassword(new_password);

      // Update password
      await db.prepare(`
        UPDATE users 
        SET password_hash = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newPasswordHash, userId);

      // Invalidate all existing sessions for security
      await revokeAllUserSessions(userId);

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_PASSWORD_RESET_SUCCESS',
        resourceType: 'AUTH',
        resourceId: user.id,
        ipAddress: ip,
        newState: JSON.stringify({ reason: 'Self-service OTP reset' })
      });

      return NextResponse.json({
        success: true,
        message: 'Your administrative password has been reset successfully. Please log in.'
      });
    }

    return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin forgot password error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during password recovery.' },
      { status: 500 }
    );
  }
}
