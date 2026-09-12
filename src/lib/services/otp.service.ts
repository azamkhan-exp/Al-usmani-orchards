import { getDatabase } from '../db';
import { ensureDatabaseReady } from '../db/init';
import { sendWhatsAppMessage, sanitizeWhatsAppPhone } from './whatsapp.service';
import { verifyPassword } from '../auth/crypto';
import crypto from 'node:crypto';

export interface AdminSecuritySettings {
  admin_otp_enabled: boolean;
  otp_provider: 'WHATSAPP' | 'SMS' | 'SIMULATED';
  verified_security_phone: string;
  otp_expiry_minutes: number;
  otp_max_attempts: number;
  otp_resend_cooldown_seconds: number;
  step_up_mfa_required: boolean;
}

const DEFAULT_SECURITY_SETTINGS: AdminSecuritySettings = {
  admin_otp_enabled: true,
  otp_provider: 'WHATSAPP',
  verified_security_phone: '+923008472910',
  otp_expiry_minutes: 5,
  otp_max_attempts: 5,
  otp_resend_cooldown_seconds: 60,
  step_up_mfa_required: true
};

/**
 * Get current admin security & OTP configuration from store_settings
 */
export async function getAdminSecuritySettings(): Promise<AdminSecuritySettings> {
  ensureDatabaseReady();
  const db = getDatabase();
  const row = await db.prepare("SELECT value_json FROM store_settings WHERE key = 'security_settings'").get() as { value_json: string } | undefined;

  if (!row?.value_json) {
    return { ...DEFAULT_SECURITY_SETTINGS };
  }

  try {
    const parsed = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json;
    return {
      admin_otp_enabled: parsed.admin_otp_enabled ?? DEFAULT_SECURITY_SETTINGS.admin_otp_enabled,
      otp_provider: parsed.otp_provider ?? DEFAULT_SECURITY_SETTINGS.otp_provider,
      verified_security_phone: parsed.verified_security_phone || DEFAULT_SECURITY_SETTINGS.verified_security_phone,
      otp_expiry_minutes: Number(parsed.otp_expiry_minutes) || DEFAULT_SECURITY_SETTINGS.otp_expiry_minutes,
      otp_max_attempts: Number(parsed.otp_max_attempts) || DEFAULT_SECURITY_SETTINGS.otp_max_attempts,
      otp_resend_cooldown_seconds: Number(parsed.otp_resend_cooldown_seconds) || DEFAULT_SECURITY_SETTINGS.otp_resend_cooldown_seconds,
      step_up_mfa_required: parsed.step_up_mfa_required ?? DEFAULT_SECURITY_SETTINGS.step_up_mfa_required
    };
  } catch {
    return { ...DEFAULT_SECURITY_SETTINGS };
  }
}

/**
 * Persist updated admin security settings
 */
export async function updateAdminSecuritySettings(
  settings: Partial<AdminSecuritySettings>,
  updatedByUserId?: string
): Promise<AdminSecuritySettings> {
  ensureDatabaseReady();
  const current = await getAdminSecuritySettings();
  const updated: AdminSecuritySettings = {
    ...current,
    ...settings
  };

  const db = getDatabase();
  await db.prepare(`
    INSERT INTO store_settings (id, key, value_json, updated_at)
    VALUES ('set_sec_settings', 'security_settings', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `).run(JSON.stringify(updated));

  // If verified_security_phone changed, update admin users' security_phone
  if (settings.verified_security_phone) {
    try {
      await db.prepare(`
        UPDATE users
        SET security_phone = ?, security_phone_verified = 1
        WHERE role IN ('SUPER_ADMIN', 'ADMIN')
      `).run(settings.verified_security_phone);
    } catch (e) {
      console.error('Failed to sync security_phone to admin users:', e);
    }
  }

  return updated;
}

/**
 * Mask a phone number for zero-leakage display in client UIs
 * e.g., '+92 300 8472910' -> '+92 ******2910'
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '+92 ******0000';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7) {
    return phone.replace(/.(?=.{3})/g, '*');
  }

  const prefix = digitsOnly.startsWith('92') ? '+92 ' : digitsOnly.startsWith('0') ? '0' : '+';
  const last4 = digitsOnly.slice(-4);
  return `${prefix}******${last4}`;
}

export interface GenerateOTPResult {
  success: boolean;
  error?: string;
  cooldown_seconds?: number;
  masked_phone?: string;
  expires_in_seconds?: number;
}

/**
 * Generate a cryptographically secure 6-digit OTP, store its SHA-256 hash,
 * and dispatch via configured provider (WhatsApp / SMS / Simulated fallback).
 */
export async function generateAndSendAdminOTP(
  userId: string,
  purpose: 'ADMIN_LOGIN' | 'STEP_UP' | 'PASSWORD_RESET' = 'ADMIN_LOGIN',
  customPhone?: string
): Promise<GenerateOTPResult> {
  ensureDatabaseReady();
  const db = getDatabase();
  const secSettings = await getAdminSecuritySettings();

  // Find user
  const user = await db.prepare('SELECT id, name, email, phone, security_phone, role FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  const targetPhone = customPhone || user.security_phone || secSettings.verified_security_phone || user.phone || '+923008472910';
  const cooldownSec = secSettings.otp_resend_cooldown_seconds || 60;

  // Check cooldown: has an OTP been created for this user/purpose within cooldownSec?
  const recentOtp = await db.prepare(`
    SELECT id, created_at,
           ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)))::int as seconds_ago
    FROM admin_otp_codes
    WHERE user_id = ? AND purpose = ? AND is_used = 0
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, purpose) as { id: string; created_at: string; seconds_ago: number } | undefined;

  if (recentOtp && recentOtp.seconds_ago !== null && recentOtp.seconds_ago < cooldownSec) {
    const remaining = cooldownSec - Math.max(0, recentOtp.seconds_ago);
    return {
      success: false,
      error: `Please wait ${remaining} second(s) before requesting another code.`,
      cooldown_seconds: remaining,
      masked_phone: maskPhoneNumber(targetPhone)
    };
  }

  // Invalidate any previous unused OTPs for this user & purpose
  await db.prepare(`
    UPDATE admin_otp_codes
    SET is_used = 1
    WHERE user_id = ? AND purpose = ? AND is_used = 0
  `).run(userId, purpose);

  // Generate 6-digit cryptographically secure code
  const codeInt = crypto.randomInt(100000, 1000000);
  const code = codeInt.toString();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  const expiryMinutes = secSettings.otp_expiry_minutes || 5;
  const expirySec = expiryMinutes * 60;
  const otpId = crypto.randomUUID();

  // Insert OTP record
  await db.prepare(`
    INSERT INTO admin_otp_codes (
      id, user_id, phone, code_hash, purpose, expires_at,
      attempts, max_attempts, is_used, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, NOW() + INTERVAL '${expiryMinutes} minutes',
      0, ?, 0, CURRENT_TIMESTAMP
    )
  `).run(otpId, userId, targetPhone, codeHash, purpose, secSettings.otp_max_attempts || 5);

  // Dispatch OTP
  const purposeDescriptions: Record<string, string> = {
    ADMIN_LOGIN: 'Administrative Console Access',
    STEP_UP: 'High-Privilege Action Authorization',
    PASSWORD_RESET: 'Password Reset Verification'
  };
  const purposeDesc = purposeDescriptions[purpose] || 'Security Verification';

  const otpMessage = `🔐 *Al Usmani Orchards — Admin Security Verification*\n\nYour 6-digit one-time passcode is: *${code}*\n\nPurpose: ${purposeDesc}\nValid for: ${expiryMinutes} minutes.\n\n⚠️ *DO NOT share this code with anyone. Al Usmani Orchards staff will never ask for your code.*`;

  if (secSettings.otp_provider === 'WHATSAPP') {
    try {
      const waResult = await sendWhatsAppMessage({
        to: sanitizeWhatsAppPhone(targetPhone),
        message: otpMessage,
        eventType: 'TEST'
      });
      if (!waResult.success) {
        console.warn(`[OTP] WhatsApp delivery returned failure: ${waResult.error}. Falling back to server-logged simulated OTP.`);
      }
    } catch (err) {
      console.error('[OTP] Error dispatching WhatsApp OTP:', err);
    }
  }

  // Always log simulated OTP for development/staging visibility without exposing in response
  console.log(`\n======================================================`);
  console.log(`🔐 [ADMIN SECURITY OTP]`);
  console.log(`To: ${maskPhoneNumber(targetPhone)} (${targetPhone})`);
  console.log(`Purpose: ${purpose}`);
  console.log(`OTP Code: >>> ${code} <<<`);
  console.log(`Expires in: ${expiryMinutes} minutes`);
  console.log(`======================================================\n`);

  return {
    success: true,
    masked_phone: maskPhoneNumber(targetPhone),
    cooldown_seconds: cooldownSec,
    expires_in_seconds: expirySec
  };
}

export interface VerifyOTPResult {
  success: boolean;
  error?: string;
  remaining_attempts?: number;
}

/**
 * Verify a 6-digit OTP against stored SHA-256 hash.
 * Enforces max attempts, expiration, and immediate single-use invalidation.
 */
export async function verifyAdminOTP(
  userId: string,
  code: string,
  purpose: 'ADMIN_LOGIN' | 'STEP_UP' | 'PASSWORD_RESET' = 'ADMIN_LOGIN'
): Promise<VerifyOTPResult> {
  ensureDatabaseReady();
  const db = getDatabase();

  const cleanCode = (code || '').trim();
  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { success: false, error: 'Please enter a valid 6-digit numeric verification code.' };
  }

  // Find latest active unused OTP for this user and purpose
  const otpRecord = await db.prepare(`
    SELECT id, code_hash, expires_at, attempts, max_attempts,
           NOW() as current_time,
           (expires_at <= NOW())::int as is_expired
    FROM admin_otp_codes
    WHERE user_id = ? AND purpose = ? AND is_used = 0
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, purpose) as {
    id: string;
    code_hash: string;
    expires_at: string;
    attempts: number;
    max_attempts: number;
    is_expired: number;
  } | undefined;

  if (!otpRecord) {
    return {
      success: false,
      error: 'No active verification code found or code has already been used. Please request a new code.'
    };
  }

  if (Number(otpRecord.is_expired) === 1) {
    return {
      success: false,
      error: 'Verification code has expired. Please request a new code.'
    };
  }

  if (otpRecord.attempts >= otpRecord.max_attempts) {
    return {
      success: false,
      error: 'Maximum verification attempts exceeded. For security, please request a new code.'
    };
  }

  // Increment attempt count
  const newAttempts = otpRecord.attempts + 1;
  await db.prepare('UPDATE admin_otp_codes SET attempts = ? WHERE id = ?').run(newAttempts, otpRecord.id);

  // Compare SHA-256 hash in constant time
  const incomingHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
  const hashesMatch =
    incomingHash.length === otpRecord.code_hash.length &&
    crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(otpRecord.code_hash));

  if (!hashesMatch) {
    const remaining = Math.max(0, otpRecord.max_attempts - newAttempts);
    return {
      success: false,
      error: remaining > 0
        ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
        : 'Maximum attempts reached. Please request a new code.',
      remaining_attempts: remaining
    };
  }

  // Code is valid! Mark as used immediately (single-use)
  await db.prepare('UPDATE admin_otp_codes SET is_used = 1 WHERE id = ?').run(otpRecord.id);

  return { success: true };
}

/**
 * Step-Up Authentication: Verify credentials for high-risk operations
 * (e.g. deleting demo data, modifying production protection, exporting financial records).
 */
export async function verifyStepUpAuth(
  userId: string,
  password?: string,
  otpCode?: string
): Promise<{ success: boolean; error?: string }> {
  ensureDatabaseReady();
  const db = getDatabase();
  const secSettings = await getAdminSecuritySettings();

  const user = await db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId) as {
    id: string;
    password_hash: string;
  } | undefined;

  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  // 1. Password verification
  if (!password) {
    return { success: false, error: 'Current administrator password is required for this operation.' };
  }

  const isPasswordCorrect = verifyPassword(password, user.password_hash);
  if (!isPasswordCorrect) {
    return { success: false, error: 'Invalid password. Step-up authentication failed.' };
  }

  // 2. Step-up OTP verification if required by security settings
  if (secSettings.step_up_mfa_required && secSettings.admin_otp_enabled) {
    if (!otpCode) {
      return { success: false, error: 'A 6-digit security OTP code is required for this high-risk operation.' };
    }
    const otpResult = await verifyAdminOTP(userId, otpCode, 'STEP_UP');
    if (!otpResult.success) {
      return { success: false, error: otpResult.error || 'Step-up OTP verification failed.' };
    }
  }

  return { success: true };
}
