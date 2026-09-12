import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { hashToken } from '@/lib/auth/crypto';
import { sendEmail } from '@/lib/email';
import { generatePasswordResetOtpHtml } from '@/lib/email/templates';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const body = await req.json();
    const { email } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDatabase();

    const user = (await db.prepare(`
      SELECT id, name, email, password_hash, status
      FROM users
      WHERE LOWER(email) = ?
    `).get(cleanEmail)) as any;

    // Even if user not found, return generic success to prevent account enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a 6-digit password reset code has been sent.'
      });
    }

    // Check if account has no password and is registered via Google OAuth
    if (!user.password_hash) {
      const oauthRow = (await db.prepare(`
        SELECT provider FROM user_oauth_accounts WHERE user_id = ?
      `).get(user.id)) as any;

      if (oauthRow && oauthRow.provider === 'google') {
        return NextResponse.json({
          success: true,
          isGoogleAccount: true,
          message: 'Your account is linked with Google Sign-In. Please click "Sign in with Google" to access your account directly.'
        });
      }
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashToken(otp);
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Invalidate previous unused reset tokens for this user
    await db.prepare(`
      UPDATE password_reset_tokens
      SET used = 1
      WHERE user_id = ? AND used = 0
    `).run(user.id);

    // Store new token
    await db.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at)
      VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `).run(tokenId, user.id, tokenHash, expiresAt);

    // Send email with luxury template
    const emailHtml = generatePasswordResetOtpHtml({
      otp,
      name: user.name,
      expiresMinutes: 10
    });

    await sendEmail({
      to: user.email,
      subject: `Al Usmani Orchards: ${otp} is your password reset code`,
      html: emailHtml,
      type: 'PASSWORD_RESET'
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${user.email}. Please check your inbox.`,
      expiresAt,
      // Provide OTP in development/test environments for automated QA
      ...(process.env.NODE_ENV !== 'production' ? { debugOtp: otp } : {})
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Failed to process password reset request.' }, { status: 500 });
  }
}

