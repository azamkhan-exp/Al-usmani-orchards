import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db/init';
import { verifyMfaChallengeToken } from '@/lib/auth/tokens';
import { generateAndSendAdminOTP, getAdminSecuritySettings } from '@/lib/services/otp.service';
import { checkRateLimit } from '@/lib/auth/rate-limit';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Rate limit: max 5 resend requests per 10 minutes per IP
    const rateCheck = checkRateLimit(`admin_otp_resend:${ip}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      const waitMinutes = Math.ceil((rateCheck.resetAt - Date.now()) / (60 * 1000));
      return NextResponse.json(
        { error: `Too many resend requests. Please wait ${waitMinutes} minute(s).` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { challenge_token, purpose = 'ADMIN_LOGIN' } = body;

    if (!challenge_token) {
      return NextResponse.json(
        { error: 'Challenge token is required to resend verification code.' },
        { status: 400 }
      );
    }

    // Verify cryptographic challenge token
    const { valid, userId } = await verifyMfaChallengeToken(challenge_token);
    if (!valid || !userId) {
      return NextResponse.json(
        { error: 'Session challenge has expired or is invalid. Please return to login.' },
        { status: 401 }
      );
    }

    const validPurposes = ['ADMIN_LOGIN', 'STEP_UP', 'PASSWORD_RESET'];
    const chosenPurpose = validPurposes.includes(purpose) ? purpose : 'ADMIN_LOGIN';

    const result = await generateAndSendAdminOTP(userId, chosenPurpose as any);
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to dispatch security code.',
          cooldown_seconds: result.cooldown_seconds,
          masked_phone: result.masked_phone
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A new 6-digit verification code has been dispatched to ${result.masked_phone}.`,
      masked_phone: result.masked_phone,
      cooldown_seconds: result.cooldown_seconds,
      expires_in_seconds: result.expires_in_seconds
    });
  } catch (err: any) {
    console.error('Admin OTP resend error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resending verification code.' },
      { status: 500 }
    );
  }
}
