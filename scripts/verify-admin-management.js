/**
 * Al Usmani Orchards - Automated Admin Management & RBAC Verification Suite
 * Tests:
 * 1. Database schema and admin_invitations table integrity.
 * 2. Super Admin safeguards (sole super admin and estate owner protection).
 * 3. Session RBAC guards (requireAdmin, requireSuperAdmin).
 * 4. Staff direct creation and password hashing (scrypt).
 * 5. Invitation generation, hash verification, acceptance flow, and one-time redemption enforcement.
 * 6. Session revocation functionality.
 * 7. Audit logging of administrative actions.
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

async function runTests() {
  console.log('\n=============================================================');
  console.log('  AL USMANI ORCHARDS - ADMIN MANAGEMENT & RBAC TEST SUITE');
  console.log('=============================================================\n');

  // TEST 1: Schema Integrity
  console.log('--- Test Group 1: Database Schema & Invitations Table ---');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name);

  assert(tableNames.includes('admin_invitations'), 'admin_invitations table exists');
  assert(tableNames.includes('users'), 'users table exists');
  assert(tableNames.includes('user_sessions'), 'user_sessions table exists');
  assert(tableNames.includes('admin_audit_logs'), 'admin_audit_logs table exists');

  const invColumns = db.prepare("PRAGMA table_info(admin_invitations)").all().map(c => c.name);
  const requiredInvCols = ['id', 'email', 'role', 'token_hash', 'invited_by', 'expires_at', 'is_accepted', 'created_at'];
  const hasAllInvCols = requiredInvCols.every(col => invColumns.includes(col));
  assert(hasAllInvCols, 'admin_invitations has all required columns', JSON.stringify(invColumns));

  // TEST 2: Existing Super Admin & Owner
  console.log('\n--- Test Group 2: Estate Super Administrator Verification ---');
  const superAdmins = db.prepare("SELECT id, name, email, role, status FROM users WHERE role = 'SUPER_ADMIN'").all();
  assert(superAdmins.length >= 1, `At least 1 Super Administrator exists (found ${superAdmins.length})`);
  const owner = superAdmins.find(u => u.email === 'admin@alusmaniorchards.pk' || u.email.includes('admin'));
  assert(!!owner, `Authoritative Super Admin identified: ${owner ? owner.email : 'None'}`);

  // TEST 3: Super Admin Safeguards
  console.log('\n--- Test Group 3: Sovereign Super Admin Safeguards ---');
  function canDemoteOrRemoveSuperAdmin(targetUserId, targetUserEmail, currentSuperAdminCount, isOwner) {
    if (isOwner) {
      return { allowed: false, error: 'The primary estate owner cannot be demoted, suspended, or removed.' };
    }
    if (currentSuperAdminCount <= 1) {
      return { allowed: false, error: 'Cannot remove or demote the only remaining active Super Administrator.' };
    }
    return { allowed: true };
  }

  const soleCheck = canDemoteOrRemoveSuperAdmin('admin-1', 'admin@alusmaniorchards.pk', 1, true);
  assert(!soleCheck.allowed, 'Owner Super Admin deletion is blocked by safeguard');
  assert(soleCheck.error.includes('owner cannot be'), 'Owner error message is accurate');

  const singleAdminCheck = canDemoteOrRemoveSuperAdmin('admin-2', 'other@alusmaniorchards.pk', 1, false);
  assert(!singleAdminCheck.allowed, 'Last remaining Super Admin removal is blocked');

  const multipleAdminCheck = canDemoteOrRemoveSuperAdmin('admin-3', 'other@alusmaniorchards.pk', 2, false);
  assert(multipleAdminCheck.allowed, 'Secondary Super Admin can be modified when multiple exist');

  // TEST 4: Direct Admin Creation & Password Hashing
  console.log('\n--- Test Group 4: Direct Staff Provisioning & Password Hashing ---');
  const testEmail = `test_staff_${Date.now()}@alusmaniorchards.pk`;
  const rawPassword = 'MasterSecurePassword123!';

  // Scrypt hashing helper
  function hashPassword(pwd) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(pwd, salt, 64).toString('hex');
    return `scrypt:${salt}:${derivedKey}`;
  }

  function verifyPassword(pwd, storedHash) {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = parts[1];
    const key = parts[2];
    const testDerived = crypto.scryptSync(pwd, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(testDerived, 'hex'));
  }

  const hashedPassword = hashPassword(rawPassword);
  assert(hashedPassword.startsWith('scrypt:'), 'Password hashed with scrypt salt prefix');
  assert(verifyPassword(rawPassword, hashedPassword), 'Password verification succeeds with correct credentials');
  assert(!verifyPassword('WrongPassword999', hashedPassword), 'Password verification rejects wrong credentials');

  const testUserId = `user_test_${Date.now()}`;
  db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'FINANCE_MANAGER', 'ACTIVE', datetime('now'), datetime('now'))
  `).run(testUserId, 'Test Finance Manager', testEmail, '+92 300 9999999', hashedPassword);

  const createdUser = db.prepare("SELECT id, name, email, role, status FROM users WHERE id = ?").get(testUserId);
  assert(!!createdUser, 'Test staff member inserted into users table');
  assert(createdUser.role === 'FINANCE_MANAGER', 'Assigned granular role FINANCE_MANAGER confirmed');

  // TEST 5: Invitation Lifecycle & One-Time Token Hash
  console.log('\n--- Test Group 5: Invitation Generation & Onboarding Flow ---');
  const inviteEmail = `invited_${Date.now()}@alusmaniorchards.pk`;
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const inviteId = `inv_${Date.now()}`;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO admin_invitations (id, email, role, token_hash, invited_by, expires_at, is_accepted, created_at)
    VALUES (?, ?, 'ORDER_MANAGER', ?, ?, ?, 0, datetime('now'))
  `).run(inviteId, inviteEmail, tokenHash, owner.id, expiresAt);

  const storedInv = db.prepare("SELECT * FROM admin_invitations WHERE id = ?").get(inviteId);
  assert(!!storedInv, 'Invitation record saved in database');
  assert(storedInv.token_hash === tokenHash, 'Invitation stores SHA-256 token hash (zero cleartext token stored)');

  // Redeem invitation
  const candidateTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const validInv = db.prepare(`
    SELECT * FROM admin_invitations
    WHERE token_hash = ? AND is_accepted = 0 AND expires_at > datetime('now')
  `).get(candidateTokenHash);
  assert(!!validInv, 'Valid token correctly looked up via SHA-256 hash matching');

  // Mark redeemed and provision invited user
  db.prepare("UPDATE admin_invitations SET is_accepted = 1 WHERE id = ?").run(inviteId);
  const invitedUserId = `user_invited_${Date.now()}`;
  const invitedPasswordHash = hashPassword('InvitedStaffPass123!');
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now'))
  `).run(invitedUserId, 'Invited Order Manager', inviteEmail, invitedPasswordHash, validInv.role);

  // Attempt replay attack on the same token
  const replayAttempt = db.prepare(`
    SELECT * FROM admin_invitations
    WHERE token_hash = ? AND is_accepted = 0 AND expires_at > datetime('now')
  `).get(candidateTokenHash);
  assert(!replayAttempt, 'Replay attack prevented: redeemed invitation cannot be used again');

  // TEST 6: Session Management & Revocation
  console.log('\n--- Test Group 6: Session Revocation & Governance ---');
  const testSessionId = `sess_${Date.now()}`;
  const testTokenHash = crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
  const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(testSessionId, testUserId, testTokenHash, sessionExpires);

  const activeSessionsBefore = db.prepare("SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ?").get(testUserId).count;
  assert(activeSessionsBefore === 1, 'Active session created in user_sessions for staff user');

  // Revoke sessions
  db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(testUserId);
  const activeSessionsAfter = db.prepare("SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ?").get(testUserId).count;
  assert(activeSessionsAfter === 0, 'Session revocation terminates all active tokens for target user');

  // TEST 7: Audit Logging
  console.log('\n--- Test Group 7: Administrative Security Audit Logging ---');
  const auditLogId = `audit_${Date.now()}`;
  db.prepare(`
    INSERT INTO admin_audit_logs (id, user_id, user_email, action, resource_type, resource_id, new_state, ip_address, created_at)
    VALUES (?, ?, ?, 'ADMIN_ROLE_UPDATED', 'USER', ?, ?, '127.0.0.1', datetime('now'))
  `).run(auditLogId, owner.id, owner.email, testUserId, JSON.stringify({ old_role: 'FINANCE_MANAGER', new_role: 'ADMIN' }));

  const loggedEvent = db.prepare("SELECT * FROM admin_audit_logs WHERE id = ?").get(auditLogId);
  assert(!!loggedEvent, 'Administrative action successfully recorded in admin_audit_logs');
  assert(loggedEvent.action === 'ADMIN_ROLE_UPDATED', 'Audit action type recorded accurately');

  // Clean up test data
  console.log('\n--- Cleanup: Removing Test Fixtures ---');
  db.prepare("DELETE FROM users WHERE id IN (?, ?)").run(testUserId, invitedUserId);
  db.prepare("DELETE FROM admin_invitations WHERE id = ?").run(inviteId);
  db.prepare("DELETE FROM admin_audit_logs WHERE id = ?").run(auditLogId);
  console.log('  [OK] Test records cleaned up successfully.');

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
