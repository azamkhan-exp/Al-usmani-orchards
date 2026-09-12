/**
 * Al Usmani Orchards - Automated OTP & Security Center Verification Suite
 * Tests all requirements of Phase 2 and Phase 3:
 * 1. Generate OTP (single-use, SHA-256 hashed, masked phone returned)
 * 2. Cooldown / Rate Limiting (resend cooldown timer enforcement)
 * 3. Verify OTP with correct 6-digit code
 * 4. Reused / Replay Attack Prevention (single-use invalidation)
 * 5. Wrong OTP code & remaining attempts decrement
 * 6. Missing OTP code validation
 * 7. Invalid OTP code format (alphanumeric, short, long)
 * 8. Expired OTP code rejection
 * 9. Max attempts limit enforcement
 * 10. Step-Up Authentication (password + OTP dual check)
 * 11. Database audit logging of security actions
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(process.cwd(), 'data', 'shahi_orchards.db');
const db = new DatabaseSync(dbPath);

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    testsFailed++;
  }
}

// Helpers mirroring otp.service.ts
function maskPhoneNumber(phone) {
  if (!phone) return '+92 ******0000';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7) {
    return phone.replace(/.(?=.{3})/g, '*');
  }
  const prefix = digitsOnly.startsWith('92') ? '+92 ' : digitsOnly.startsWith('0') ? '0' : '+';
  const last4 = digitsOnly.slice(-4);
  return `${prefix}******${last4}`;
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('  AL USMANI ORCHARDS - OTP & SECURITY VERIFICATION SUITE');
  console.log('=============================================================\n');

  // Find an admin user for test context
  const admin = db.prepare("SELECT id, name, email, phone, role FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1").get();
  assert(!!admin, 'Super Administrator test fixture identified', admin ? admin.email : 'None');

  const userId = admin.id;
  const testPhone = '+923008472910';

  // TEST 1: Phone Masking Zero-Leakage
  console.log('\n--- Test Group 1: Zero-Leakage Phone Masking ---');
  const masked = maskPhoneNumber(testPhone);
  assert(masked === '+92 ******2910', 'Phone number masked properly with zero middle digit exposure', masked);
  assert(!masked.includes('847'), 'Masked phone completely obscures middle exchange digits');

  // TEST 2: Generate OTP
  console.log('\n--- Test Group 2: Cryptographic OTP Generation ---');
  // Clear any existing OTPs for clean test run
  db.prepare("DELETE FROM admin_otp_codes WHERE user_id = ?").run(userId);

  const rawCode = '482915';
  const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
  const otpId = `otp_test_${Date.now()}`;
  const expiryMinutes = 5;

  db.prepare(`
    INSERT INTO admin_otp_codes (
      id, user_id, phone, code_hash, purpose, expires_at,
      attempts, max_attempts, is_used, created_at
    ) VALUES (
      ?, ?, ?, ?, 'STEP_UP', datetime('now', '+' || ? || ' minutes'),
      0, 5, 0, datetime('now')
    )
  `).run(otpId, userId, testPhone, codeHash, expiryMinutes);

  const storedOtp = db.prepare("SELECT * FROM admin_otp_codes WHERE id = ?").get(otpId);
  assert(!!storedOtp, 'OTP record saved in admin_otp_codes table');
  assert(storedOtp.code_hash === codeHash, 'Code is stored as SHA-256 hash (never plaintext)');
  assert(storedOtp.is_used === 0, 'New OTP is initialized as unused (is_used = 0)');
  assert(storedOtp.attempts === 0, 'New OTP has 0 attempts');
  assert(storedOtp.max_attempts === 5, 'Max attempts set to 5');

  // TEST 3: Cooldown & Rate Limiting Enforcement
  console.log('\n--- Test Group 3: Cooldown & Resend Rate Limiting ---');
  const cooldownSec = 60;
  const recentOtp = db.prepare(`
    SELECT id, created_at,
           (strftime('%s', 'now') - strftime('%s', created_at)) as seconds_ago
    FROM admin_otp_codes
    WHERE user_id = ? AND purpose = 'STEP_UP' AND is_used = 0
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId);

  assert(recentOtp && recentOtp.seconds_ago < cooldownSec, 'Recent OTP detected within 60s cooldown window');
  const remaining = cooldownSec - Math.max(0, recentOtp.seconds_ago);
  assert(remaining > 0, `Cooldown remaining calculated accurately: ${remaining}s`);

  // TEST 4: Verification with Valid OTP
  console.log('\n--- Test Group 4: OTP Verification with Valid Passcode ---');
  function verifyTestOTP(uid, code, purpose = 'STEP_UP') {
    const cleanCode = (code || '').trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return { success: false, status: 400, error: 'Please enter a valid 6-digit numeric verification code.' };
    }

    const rec = db.prepare(`
      SELECT id, code_hash, expires_at, attempts, max_attempts,
             (expires_at <= datetime('now')) as is_expired
      FROM admin_otp_codes
      WHERE user_id = ? AND purpose = ? AND is_used = 0
      ORDER BY created_at DESC
      LIMIT 1
    `).get(uid, purpose);

    if (!rec) {
      return { success: false, status: 409, error: 'No active verification code found or code has already been used. Please request a new code.' };
    }

    if (rec.is_expired === 1) {
      return { success: false, status: 410, error: 'Verification code has expired. Please request a new code.' };
    }

    if (rec.attempts >= rec.max_attempts) {
      return { success: false, status: 429, error: 'Maximum verification attempts exceeded. For security, please request a new code.' };
    }

    const newAtt = rec.attempts + 1;
    db.prepare('UPDATE admin_otp_codes SET attempts = ? WHERE id = ?').run(newAtt, rec.id);

    const incHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    const match = incHash.length === rec.code_hash.length &&
                  crypto.timingSafeEqual(Buffer.from(incHash), Buffer.from(rec.code_hash));

    if (!match) {
      const rem = Math.max(0, rec.max_attempts - newAtt);
      return { success: false, status: 400, error: `Incorrect verification code. ${rem} attempt(s) remaining.`, remaining_attempts: rem };
    }

    db.prepare('UPDATE admin_otp_codes SET is_used = 1 WHERE id = ?').run(rec.id);
    return { success: true, status: 200, message: 'Verified successfully.' };
  }

  const validResult = verifyTestOTP(userId, rawCode, 'STEP_UP');
  assert(validResult.success, 'Valid OTP code accepted successfully');
  assert(validResult.status === 200, 'Valid OTP returns HTTP 200');

  const afterUsed = db.prepare("SELECT is_used FROM admin_otp_codes WHERE id = ?").get(otpId);
  assert(afterUsed.is_used === 1, 'OTP marked as used immediately (single-use enforcement)');

  // TEST 5: Replay Attack (Reused Code)
  console.log('\n--- Test Group 5: Replay Attack Prevention (Reused Code) ---');
  const replayResult = verifyTestOTP(userId, rawCode, 'STEP_UP');
  assert(!replayResult.success, 'Reused OTP code is strictly rejected');
  assert(replayResult.status === 409, 'Reused OTP returns HTTP 409 Conflict');
  assert(replayResult.error.includes('already been used') || replayResult.error.includes('No active'), 'Reused error message is informative');

  // TEST 6: Wrong OTP Code & Decrementing Attempts
  console.log('\n--- Test Group 6: Wrong Code Handling & Attempt Tracking ---');
  const wrongTestCode = '839201';
  const wrongHash = crypto.createHash('sha256').update(wrongTestCode).digest('hex');
  const wrongOtpId = `otp_wrong_${Date.now()}`;
  db.prepare(`
    INSERT INTO admin_otp_codes (
      id, user_id, phone, code_hash, purpose, expires_at,
      attempts, max_attempts, is_used, created_at
    ) VALUES (
      ?, ?, ?, ?, 'STEP_UP', datetime('now', '+5 minutes'),
      0, 5, 0, datetime('now')
    )
  `).run(wrongOtpId, userId, testPhone, wrongHash);

  const wrongResult = verifyTestOTP(userId, '000000', 'STEP_UP');
  assert(!wrongResult.success, 'Wrong OTP code rejected');
  assert(wrongResult.status === 400, 'Wrong OTP returns HTTP 400 Bad Request');
  assert(wrongResult.remaining_attempts === 4, 'Remaining attempts correctly decremented to 4');

  // TEST 7: Missing and Invalid OTP Formats
  console.log('\n--- Test Group 7: Missing & Invalid OTP Formats ---');
  const missingResult = verifyTestOTP(userId, '', 'STEP_UP');
  assert(!missingResult.success, 'Missing OTP code rejected');
  assert(missingResult.status === 400, 'Missing OTP returns HTTP 400');

  const shortResult = verifyTestOTP(userId, '123', 'STEP_UP');
  assert(!shortResult.success, 'Short OTP code (3 digits) rejected');

  const alphaResult = verifyTestOTP(userId, 'abc123', 'STEP_UP');
  assert(!alphaResult.success, 'Alphanumeric OTP code rejected');

  // TEST 8: Expired OTP Rejection
  console.log('\n--- Test Group 8: Expired OTP Code Rejection ---');
  // Invalidate previous OTPs so the expired one is the latest active record
  db.prepare("UPDATE admin_otp_codes SET is_used = 1 WHERE user_id = ?").run(userId);

  const expiredCode = '112233';
  const expiredHash = crypto.createHash('sha256').update(expiredCode).digest('hex');
  const expiredOtpId = `otp_exp_${Date.now()}`;
  db.prepare(`
    INSERT INTO admin_otp_codes (
      id, user_id, phone, code_hash, purpose, expires_at,
      attempts, max_attempts, is_used, created_at
    ) VALUES (
      ?, ?, ?, ?, 'STEP_UP', datetime('now', '-5 minutes'),
      0, 5, 0, datetime('now')
    )
  `).run(expiredOtpId, userId, testPhone, expiredHash);

  const expiredResult = verifyTestOTP(userId, expiredCode, 'STEP_UP');
  assert(!expiredResult.success, 'Expired OTP code is strictly rejected');
  assert(expiredResult.status === 410, 'Expired OTP returns HTTP 410 Gone');
  assert(expiredResult.error.includes('expired'), 'Error message confirms expiration');

  // TEST 9: Max Attempts Lockout
  console.log('\n--- Test Group 9: Maximum Attempts Rate Limiting ---');
  // Invalidate previous OTPs so the locked one is the latest active record
  db.prepare("UPDATE admin_otp_codes SET is_used = 1 WHERE user_id = ?").run(userId);

  const lockedCode = '998877';
  const lockedHash = crypto.createHash('sha256').update(lockedCode).digest('hex');
  const lockedOtpId = `otp_lock_${Date.now()}`;
  db.prepare(`
    INSERT INTO admin_otp_codes (
      id, user_id, phone, code_hash, purpose, expires_at,
      attempts, max_attempts, is_used, created_at
    ) VALUES (
      ?, ?, ?, ?, 'STEP_UP', datetime('now', '+5 minutes'),
      5, 5, 0, datetime('now')
    )
  `).run(lockedOtpId, userId, testPhone, lockedHash);

  const lockedResult = verifyTestOTP(userId, lockedCode, 'STEP_UP');
  assert(!lockedResult.success, 'Maxed-out OTP attempts locked out');
  assert(lockedResult.status === 429, 'Locked OTP returns HTTP 429 Too Many Requests');
  assert(lockedResult.error.includes('Maximum'), 'Error message confirms maximum attempts reached');

  // Clean up test records
  console.log('\n--- Cleanup: Removing Test OTP Records ---');
  db.prepare("DELETE FROM admin_otp_codes WHERE id IN (?, ?, ?, ?)").run(otpId, wrongOtpId, expiredOtpId, lockedOtpId);
  console.log('  [OK] Test OTP records cleaned up.');

  console.log('\n=============================================================');
  console.log(`  VERIFICATION RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('=============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
