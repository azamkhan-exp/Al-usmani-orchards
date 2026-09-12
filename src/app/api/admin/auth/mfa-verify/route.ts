import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { createSession } from '@/lib/auth/session';
import { verifyMfaChallengeToken } from '@/lib/auth/tokens';
import { verifyTotpCode, verifyAndConsumeRecoveryCode } from '@/lib/auth/totp';
import { recordAuditLog } from '@/lib/services/audit.service';
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';

    // Rate limit: 5 attempts per 15 minutes
    const rateCheck = checkRateLimit(`admin_mfa:${ip}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const waitMinutes = Math.ceil((rateCheck.resetAt - Date.now()) / (60 * 1000));
      return NextResponse.json(
        { error: `Too many failed verification attempts. Please wait ${waitMinutes} minute(s).` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { challenge_token, code } = body;

    if (!challenge_token || !code) {
      return NextResponse.json(
        { error: 'Challenge token and verification code are required.' },
        { status: 400 }
      );
    }

    const { valid, userId } = await verifyMfaChallengeToken(challenge_token);
    if (!valid || !userId) {
      return NextResponse.json(
        { error: 'Challenge token has expired or is invalid. Please log in again.' },
        { status: 401 }
      );
    }

    const db = getDatabase();
    const user = db.prepare(`
      SELECT id, username, name, email, role, status, mfa_enabled, mfa_secret, mfa_recovery_codes_json
      FROM users
      WHERE id = ?
    `).get(userId) as any;

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Administrative account is inactive.' }, { status: 403 });
    }

    if (!user.mfa_enabled || !user.mfa_secret) {
      return NextResponse.json({ error: 'Two-factor authentication is not configured for this account.' }, { status: 400 });
    }

    let verified = false;
    let authMethod = 'TOTP';

    // 1. Try TOTP code
    const cleanCode = code.trim().replace(/\s+/g, '');
    if (cleanCode.length === 6 && /^\d{6}$/.test(cleanCode)) {
      if (verifyTotpCode(user.mfa_secret, cleanCode)) {
        verified = true;
      }
    }

    // 2. If TOTP failed or user provided a recovery code format, check recovery codes
    if (!verified) {
      const recoveryResult = verifyAndConsumeRecoveryCode(code, user.mfa_recovery_codes_json);
      if (recoveryResult.valid) {
        verified = true;
        authMethod = 'RECOVERY_CODE';
        // Persist consumed recovery code
        db.prepare(`
          UPDATE users 
          SET mfa_recovery_codes_json = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(recoveryResult.updatedCodesJson, user.id);
      }
    }

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code or recovery key. Please verify your authenticator app.' },
        { status: 401 }
      );
    }

    // Authentication successful
    await createSession(user.id, ip, userAgent);
    resetRateLimit(`admin_mfa:${ip}`);
    resetRateLimit(`admin_login:${ip}`);

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_MFA_LOGIN_SUCCESS',
      resourceType: 'AUTH',
      resourceId: user.id,
      ipAddress: ip,
      newState: JSON.stringify({ method: authMethod, role: user.role })
    });

    return NextResponse.json({
      success: true,
      redirect: '/admin',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('MFA verify error:', err);
    return NextResponse.json(
      { error: 'Failed to verify authentication code.' },
      { status: 500 }
    );
  }
}
