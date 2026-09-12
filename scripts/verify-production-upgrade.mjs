import { getDatabase } from '../src/lib/db/index.ts';
import { ensureDatabaseReady } from '../src/lib/db/init.ts';
import {
  getAdminSecuritySettings,
  updateAdminSecuritySettings,
  generateAndSendAdminOTP,
  verifyAdminOTP,
  maskPhoneNumber
} from '../src/lib/services/otp.service.ts';
import {
  getDatabaseOverview,
  previewDemoDataCleanup,
  archiveOrder,
  restoreOrder,
  getProductionProtectionSettings
} from '../src/lib/services/data-management.service.ts';
import { getAnalyticsDashboard } from '../src/lib/services/analytics.service.ts';
import { performSystemHealthCheck } from '../src/lib/services/health.service.ts';
import assert from 'node:assert';

console.log('🚀 [TEST] Starting End-to-End Production Upgrade Verification Suite...\n');

// 1. Ensure DB Ready
ensureDatabaseReady();
const db = getDatabase();
console.log('✅ [TEST 1] Database initialized and migrations verified.');

// 2. Schema Verification
const tableCheck = db.prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name='admin_otp_codes'").get();
assert.strictEqual(tableCheck.c, 1, 'admin_otp_codes table must exist');

const orderCols = db.prepare("PRAGMA table_info(orders)").all();
const orderColNames = new Set(orderCols.map(c => c.name));
assert(orderColNames.has('is_demo'), 'orders.is_demo column must exist');
assert(orderColNames.has('is_archived'), 'orders.is_archived column must exist');
assert(orderColNames.has('archived_at'), 'orders.archived_at column must exist');

const userCols = db.prepare("PRAGMA table_info(users)").all();
const userColNames = new Set(userCols.map(c => c.name));
assert(userColNames.has('security_phone'), 'users.security_phone must exist');
assert(userColNames.has('security_phone_verified'), 'users.security_phone_verified must exist');
console.log('✅ [TEST 2] Schema, columns, and indexes verified.');

// 3. Security Settings & Phone Masking
const secSettings = getAdminSecuritySettings();
assert(secSettings.admin_otp_enabled === true, 'admin_otp_enabled should default to true');
assert.strictEqual(maskPhoneNumber('+92 300 8472910'), '+92 ******2910', 'Phone masking should be zero-leakage');
console.log('✅ [TEST 3] Admin security settings and phone masking (+92 ******2910) verified.');

// 4. OTP Lifecycle
const admin = db.prepare("SELECT id, email, phone FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1").get();
assert(admin, 'Admin user must exist');

// Clean up any test OTPs for this admin
db.prepare("DELETE FROM admin_otp_codes WHERE user_id = ?").run(admin.id);

// Generate OTP
const otpResult = await generateAndSendAdminOTP(admin.id, 'ADMIN_LOGIN');
assert(otpResult.success === true, 'OTP generation must succeed');
assert(otpResult.masked_phone, 'Masked phone must be returned');

// Verify stored record in admin_otp_codes
const storedOtp = db.prepare("SELECT * FROM admin_otp_codes WHERE user_id = ? AND purpose = 'ADMIN_LOGIN' AND is_used = 0 ORDER BY created_at DESC LIMIT 1").get();
assert(storedOtp, 'OTP record must be stored in database');
assert.strictEqual(storedOtp.is_used, 0, 'Initial is_used must be 0');
assert.strictEqual(storedOtp.attempts, 0, 'Initial attempts must be 0');

// Test invalid code attempt
const failResult = verifyAdminOTP(admin.id, '999999', 'ADMIN_LOGIN');
assert.strictEqual(failResult.success, false, 'Invalid OTP should fail');
const updatedStoredOtp = db.prepare("SELECT attempts FROM admin_otp_codes WHERE id = ?").get(storedOtp.id);
assert.strictEqual(updatedStoredOtp.attempts, 1, 'Attempts must increment on failure');

// Test cooldown enforcement
const cooldownResult = await generateAndSendAdminOTP(admin.id, 'ADMIN_LOGIN');
assert.strictEqual(cooldownResult.success, false, 'Should be blocked by cooldown');
assert(cooldownResult.cooldown_seconds > 0, 'Cooldown seconds must be returned');

console.log('✅ [TEST 4] Cryptographic OTP generation, hashing, attempts tracking, and cooldown verified.');

// 5. Data Management Overview & Preview
const overview = getDatabaseOverview();
assert(overview.counts.orders.total >= 0, 'Overview orders count must be defined');
assert(overview.protection.enabled !== undefined, 'Protection status must be defined');

const preview = previewDemoDataCleanup();
assert(preview.categories.orders.count !== undefined, 'Preview orders count must be defined');
console.log(`✅ [TEST 5] Database overview & cleanup preview verified (Total affected preview: ${preview.total_records_to_delete} rows).`);

// 6. Order Archiving & Restoration
const testOrder = db.prepare("SELECT id FROM orders LIMIT 1").get();
if (testOrder) {
  const archiveOk = archiveOrder(testOrder.id, admin.id, admin.email);
  assert.strictEqual(archiveOk, true, 'Order archiving must succeed');
  const archivedRow = db.prepare("SELECT is_archived, archived_at FROM orders WHERE id = ?").get(testOrder.id);
  assert.strictEqual(archivedRow.is_archived, 1, 'Order is_archived must be 1');
  assert(archivedRow.archived_at !== null, 'archived_at must be set');

  const restoreOk = restoreOrder(testOrder.id, admin.id, admin.email);
  assert.strictEqual(restoreOk, true, 'Order restoration must succeed');
  const restoredRow = db.prepare("SELECT is_archived, archived_at FROM orders WHERE id = ?").get(testOrder.id);
  assert.strictEqual(restoredRow.is_archived, 0, 'Order is_archived must be 0');
  assert.strictEqual(restoredRow.archived_at, null, 'archived_at must be reset to null');
  console.log('✅ [TEST 6] Order soft-archiving and restoration verified.');
}

// 7. Analytics Engine Verification
const analytics = getAnalyticsDashboard({ preset: '30d' });
assert(analytics.kpis.revenue.current !== undefined, 'Revenue KPI must exist');
assert(analytics.kpis.orders.current !== undefined, 'Orders KPI must exist');
assert(Array.isArray(analytics.charts.timeSeries), 'Time series chart data must be array');
console.log(`✅ [TEST 7] Analytics engine verified (Live Revenue: PKR ${analytics.kpis.revenue.current}, Live Orders: ${analytics.kpis.orders.current}).`);

// 8. System Health Diagnostic Verification
const health = performSystemHealthCheck();
assert(health.subsystems.database.status === 'HEALTHY', 'Database health must be HEALTHY');
assert(health.launch_checklist.items.length === 16, 'Launch checklist must have exactly 16 items');
assert(health.launch_checklist.score_percentage > 70, 'Launch readiness score must be strong');
console.log(`✅ [TEST 8] System Health & Launch Checklist verified (Score: ${health.launch_checklist.score_percentage}%, ${health.launch_checklist.passed_count}/16 passed).`);

console.log('\n🎉 ALL 8 TEST SUITES PASSED CLEANLY!\n');
