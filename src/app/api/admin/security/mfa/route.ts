import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/crypto';
import {
  generateTotpSecret,
  generateTotpUri,
  generateTotpQrCodeDataUrl,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode
} from '@/lib/auth/totp';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const db = getDatabase();
    const userRow = db.prepare(`
      SELECT mfa_enabled, mfa_verified_at, mfa_recovery_codes_json
      FROM users
      WHERE id = ?
    `).get(user.id) as any;

    if (userRow?.mfa_enabled === 1) {
      let remainingRecoveryCodes = 0;
      try {
        const codes = JSON.parse(userRow.mfa_recovery_codes_json || '[]');
        remainingRecoveryCodes = codes.filter((c: any) => !c.used).length;
      } catch {
        // Ignore JSON error
      }

      return NextResponse.json({
        success: true,
        mfa_enabled: true,
        verified_at: userRow.mfa_verified_at,
        remaining_recovery_codes: remainingRecoveryCodes
      });
    }

    // Generate fresh setup payload for enabling 2FA
    const secret = generateTotpSecret(20);
    const uri = generateTotpUri(user.email, secret, 'Al Usmani Orchards');
    const qrDataUrl = await generateTotpQrCodeDataUrl(uri);

    return NextResponse.json({
      success: true,
      mfa_enabled: false,
      setup: {
        secret,
        uri,
        qr_data_url: qrDataUrl
      }
    });
  } catch (err: any) {
    console.error('MFA status error:', err);
    return NextResponse.json({ error: 'Failed to retrieve MFA status.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, current_password, secret, code } = body;

    if (!current_password) {
      return NextResponse.json(
        { error: 'Current password is required to verify identity.' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const userRow = db.prepare(`
      SELECT password_hash, mfa_enabled, mfa_secret, mfa_recovery_codes_json
      FROM users
      WHERE id = ?
    `).get(user.id) as any;

    if (!userRow || !verifyPassword(current_password, userRow.password_hash)) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // 1. ENABLE MFA
    if (action === 'ENABLE') {
      if (!secret || !code) {
        return NextResponse.json(
          { error: 'Setup secret and 6-digit confirmation code are required.' },
          { status: 400 }
        );
      }

      const isValidCode = verifyTotpCode(secret, code);
      if (!isValidCode) {
        return NextResponse.json(
          { error: 'Invalid authenticator code. Please ensure your device clock is synchronized.' },
          { status: 400 }
        );
      }

      // Generate 8 emergency recovery codes
      const { plainCodes, hashedCodes } = generateRecoveryCodes(8);

      db.prepare(`
        UPDATE users 
        SET mfa_enabled = 1,
            mfa_secret = ?,
            mfa_recovery_codes_json = ?,
            mfa_verified_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(secret, JSON.stringify(hashedCodes), user.id);

      recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_MFA_ENABLED',
        resourceType: 'AUTH',
        resourceId: user.id,
        ipAddress: ip
      });

      return NextResponse.json({
        success: true,
        message: 'Two-factor authentication has been enabled.',
        plain_recovery_codes: plainCodes
      });
    }

    // 2. DISABLE MFA
    if (action === 'DISABLE') {
      if (!userRow.mfa_enabled) {
        return NextResponse.json({ error: 'Two-factor authentication is not currently active.' }, { status: 400 });
      }

      // Verify code (TOTP or recovery code)
      let verified = false;
      if (code) {
        if (verifyTotpCode(userRow.mfa_secret, code)) {
          verified = true;
        } else {
          const recCheck = verifyAndConsumeRecoveryCode(code, userRow.mfa_recovery_codes_json);
          if (recCheck.valid) {
            verified = true;
          }
        }
      }

      if (!verified) {
        return NextResponse.json(
          { error: 'Valid 6-digit authenticator code or recovery key is required to disable 2FA.' },
          { status: 400 }
        );
      }

      db.prepare(`
        UPDATE users 
        SET mfa_enabled = 0,
            mfa_secret = NULL,
            mfa_recovery_codes_json = NULL,
            mfa_verified_at = NULL,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(user.id);

      recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_MFA_DISABLED',
        resourceType: 'AUTH',
        resourceId: user.id,
        ipAddress: ip
      });

      return NextResponse.json({
        success: true,
        message: 'Two-factor authentication has been disabled.'
      });
    }

    // 3. REGENERATE RECOVERY CODES
    if (action === 'REGENERATE_RECOVERY_CODES') {
      if (!userRow.mfa_enabled) {
        return NextResponse.json({ error: 'Two-factor authentication is not enabled.' }, { status: 400 });
      }

      const { plainCodes, hashedCodes } = generateRecoveryCodes(8);

      db.prepare(`
        UPDATE users 
        SET mfa_recovery_codes_json = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(JSON.stringify(hashedCodes), user.id);

      recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_MFA_RECOVERY_CODES_REGENERATED',
        resourceType: 'AUTH',
        resourceId: user.id,
        ipAddress: ip
      });

      return NextResponse.json({
        success: true,
        message: 'New recovery codes generated. Previous codes have been invalidated.',
        plain_recovery_codes: plainCodes
      });
    }

    return NextResponse.json({ error: 'Unsupported MFA action.' }, { status: 400 });
  } catch (err: any) {
    console.error('MFA update error:', err);
    return NextResponse.json({ error: 'Failed to process MFA request.' }, { status: 500 });
  }
}
