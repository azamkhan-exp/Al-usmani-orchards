import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { verifyPassword } from '@/lib/auth/crypto';
import { createSession } from '@/lib/auth/session';
import { signMfaChallengeToken } from '@/lib/auth/tokens';
import { recordAuditLog } from '@/lib/services/audit.service';
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';
import { getAdminSecuritySettings, generateAndSendAdminOTP } from '@/lib/services/otp.service';

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
    const userAgent = req.headers.get('user-agent') || '';

    // Rate limit: 5 attempts per 15 minutes per IP
    const rateCheck = checkRateLimit(`admin_login:${ip}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const waitMinutes = Math.ceil((rateCheck.resetAt - Date.now()) / (60 * 1000));
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${waitMinutes} minute(s).` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username or email and password are required.' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const cleanIdentifier = identifier.trim().toLowerCase();

    const user = await db.prepare(`
      SELECT id, username, name, email, password_hash, role, status, mfa_enabled, mfa_secret
      FROM users
      WHERE LOWER(email) = ? OR LOWER(username) = ?
    `).get(cleanIdentifier, cleanIdentifier) as any;

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    if (!ADMIN_ROLES.has(user.role)) {
      return NextResponse.json(
        { error: 'Access restricted to authorized administrative personnel.' },
        { status: 403 }
      );
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Administrative account is inactive or suspended.' },
        { status: 403 }
      );
    }

    const isValidPassword = verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // 1. Two-factor authentication challenge (TOTP App)
    if (user.mfa_enabled === 1 && user.mfa_secret) {
      const challengeToken = await signMfaChallengeToken(user.id);
      return NextResponse.json({
        mfa_required: true,
        challenge_token: challengeToken,
        message: 'Two-factor authentication code required.'
      });
    }

    // 2. Admin Security OTP Challenge (WhatsApp / SMS)
    const secSettings = await getAdminSecuritySettings();
    if (secSettings.admin_otp_enabled) {
      const otpResult = await generateAndSendAdminOTP(user.id, 'ADMIN_LOGIN');
      const challengeToken = await signMfaChallengeToken(user.id, 300);

      return NextResponse.json({
        otp_required: true,
        challenge_token: challengeToken,
        masked_phone: otpResult.masked_phone,
        cooldown_seconds: otpResult.cooldown_seconds || 60,
        expires_in_seconds: otpResult.expires_in_seconds || 300,
        message: `A 6-digit security code has been sent to your verified phone (${otpResult.masked_phone}).`
      });
    }

    // 3. Direct login if no MFA/OTP is enabled
    await createSession(user.id, ip, userAgent);
    resetRateLimit(`admin_login:${ip}`);

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_LOGIN_SUCCESS',
      resourceType: 'AUTH',
      resourceId: user.id,
      ipAddress: ip,
      newState: JSON.stringify({ method: 'password', role: user.role })
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
    console.error('Admin login error:', err);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}
