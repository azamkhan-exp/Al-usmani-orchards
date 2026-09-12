import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { createSession } from '@/lib/auth/session';
import { verifyMfaChallengeToken } from '@/lib/auth/tokens';
import { verifyAdminOTP } from '@/lib/services/otp.service';
import { recordAuditLog } from '@/lib/services/audit.service';
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rate-limit';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';

    // Rate limit: 10 attempts per 15 minutes per IP
    const rateCheck = checkRateLimit(`admin_otp_verify:${ip}`, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      const waitMinutes = Math.ceil((rateCheck.resetAt - Date.now()) / (60 * 1000));
      return NextResponse.json(
        { error: `Too many verification attempts. Please wait ${waitMinutes} minute(s).` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { challenge_token, code } = body;

    if (!challenge_token || !code) {
      return NextResponse.json(
        { error: 'Challenge token and 6-digit verification code are required.' },
        { status: 400 }
      );
    }

    // Verify cryptographic challenge token
    const { valid, userId } = await verifyMfaChallengeToken(challenge_token);
    if (!valid || !userId) {
      return NextResponse.json(
        { error: 'Authentication challenge has expired or is invalid. Please return to login.' },
        { status: 401 }
      );
    }

    const db = getDatabase();
    const user = db.prepare(`
      SELECT id, username, name, email, role, status
      FROM users
      WHERE id = ?
    `).get(userId) as any;

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Administrative account is inactive.' }, { status: 403 });
    }

    // Verify OTP against hashed store
    const verifyResult = verifyAdminOTP(user.id, code, 'ADMIN_LOGIN');
    if (!verifyResult.success) {
      return NextResponse.json(
        { error: verifyResult.error || 'Invalid verification code.' },
        { status: 401 }
      );
    }

    // Authentication successful - create session
    await createSession(user.id, ip, userAgent);
    resetRateLimit(`admin_otp_verify:${ip}`);
    resetRateLimit(`admin_login:${ip}`);

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_OTP_LOGIN_SUCCESS',
      resourceType: 'AUTH',
      resourceId: user.id,
      ipAddress: ip,
      newState: JSON.stringify({ method: 'OTP_WHATSAPP', role: user.role })
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
    console.error('Admin OTP verify error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during OTP verification.' },
      { status: 500 }
    );
  }
}
