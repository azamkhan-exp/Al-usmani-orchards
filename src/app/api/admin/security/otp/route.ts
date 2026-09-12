import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getAdminSecuritySettings,
  updateAdminSecuritySettings,
  generateAndSendAdminOTP,
  maskPhoneNumber,
  verifyAdminOTP
} from '@/lib/services/otp.service';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const settings = getAdminSecuritySettings();
    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        masked_phone: maskPhoneNumber(settings.verified_security_phone)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const { admin_otp_enabled, otp_provider, verified_security_phone, step_up_mfa_required, otp_code } = body;

    // If changing security phone number and step_up verification code is provided, verify it first!
    if (verified_security_phone && otp_code) {
      const verifyResult = verifyAdminOTP(user.id, otp_code, 'STEP_UP');
      if (!verifyResult.success) {
        return NextResponse.json({
          error: verifyResult.error || 'Invalid or expired verification code for phone update.'
        }, { status: 400 });
      }
    }

    const previous = getAdminSecuritySettings();
    const updated = updateAdminSecuritySettings({
      ...(admin_otp_enabled !== undefined ? { admin_otp_enabled: Boolean(admin_otp_enabled) } : {}),
      ...(otp_provider ? { otp_provider } : {}),
      ...(verified_security_phone ? { verified_security_phone: verified_security_phone.trim() } : {}),
      ...(step_up_mfa_required !== undefined ? { step_up_mfa_required: Boolean(step_up_mfa_required) } : {})
    }, user.id);

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_OTP_SETTINGS_UPDATED',
      resourceType: 'SECURITY',
      resourceId: 'security_settings',
      previousState: previous,
      newState: updated
    });

    return NextResponse.json({
      success: true,
      message: 'Security settings updated successfully.',
      settings: {
        ...updated,
        masked_phone: maskPhoneNumber(updated.verified_security_phone)
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const action = (body.action || body.type || '').trim().toUpperCase();
    const purpose = body.purpose || 'STEP_UP';

    // 1. GENERATE / DISPATCH OTP ACTION
    // Handles: TEST_DISPATCH, SEND_TEST_OTP, GENERATE_OTP, DISPATCH_OTP, REQUEST_OTP
    if (['TEST_DISPATCH', 'SEND_TEST_OTP', 'GENERATE_OTP', 'DISPATCH_OTP', 'REQUEST_OTP', 'SEND_OTP'].includes(action)) {
      const customPhone = body.phone || body.customPhone;
      const result = await generateAndSendAdminOTP(user.id, purpose, customPhone);

      if (!result.success) {
        if (result.cooldown_seconds && result.cooldown_seconds > 0) {
          return NextResponse.json(
            { error: result.error, cooldown_seconds: result.cooldown_seconds },
            { status: 429 }
          );
        }
        return NextResponse.json({ error: result.error || 'Failed to dispatch verification code.' }, { status: 500 });
      }

      recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_OTP_DISPATCHED',
        resourceType: 'SECURITY',
        resourceId: user.id,
        newState: { purpose, masked_phone: result.masked_phone }
      });

      return NextResponse.json({
        success: true,
        message: `Security passcode successfully dispatched to ${result.masked_phone}. Valid for 5 minutes.`,
        masked_phone: result.masked_phone,
        cooldown_seconds: result.cooldown_seconds,
        expires_in_seconds: result.expires_in_seconds
      });
    }

    // 2. VERIFY OTP ACTION
    // Handles: VERIFY_OTP, VERIFY, CHECK_OTP
    if (['VERIFY_OTP', 'VERIFY', 'CHECK_OTP'].includes(action)) {
      const code = (body.code || body.otp_code || '').toString().trim();

      if (!code) {
        return NextResponse.json({ error: 'A 6-digit verification code is required.' }, { status: 400 });
      }

      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: 'Please enter a valid 6-digit numeric verification code.' }, { status: 400 });
      }

      const verifyResult = verifyAdminOTP(user.id, code, purpose);

      if (!verifyResult.success) {
        const isMaxAttempts = verifyResult.error?.includes('Maximum');
        const isExpired = verifyResult.error?.includes('expired');
        const isUsed = verifyResult.error?.includes('already been used') || verifyResult.error?.includes('No active');

        recordAuditLog({
          userId: user.id,
          userEmail: user.email,
          action: 'ADMIN_OTP_VERIFICATION_FAILED',
          resourceType: 'SECURITY',
          resourceId: user.id,
          newState: { purpose, reason: verifyResult.error }
        });

        const status = isMaxAttempts ? 429 : isExpired ? 410 : isUsed ? 409 : 400;
        return NextResponse.json({
          error: verifyResult.error,
          remaining_attempts: verifyResult.remaining_attempts
        }, { status });
      }

      recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_OTP_VERIFICATION_SUCCESS',
        resourceType: 'SECURITY',
        resourceId: user.id,
        newState: { purpose }
      });

      return NextResponse.json({
        success: true,
        message: 'Security verification code verified successfully.'
      });
    }

    return NextResponse.json(
      { error: `Invalid action "${body.action || 'empty'}". Allowed actions: SEND_TEST_OTP, TEST_DISPATCH, GENERATE_OTP, VERIFY_OTP.` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error in POST /api/admin/security/otp:', err);
    return NextResponse.json({ error: 'An unexpected security service error occurred.' }, { status: 500 });
  }
}
