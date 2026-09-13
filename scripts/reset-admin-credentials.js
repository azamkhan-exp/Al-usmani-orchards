#!/usr/bin/env node
/**
 * scripts/reset-admin-credentials.js
 *
 * Emergency Admin Credential Reset Script
 * ────────────────────────────────────────
 * Generates a new cryptographically-random password for the ADMIN_OWNER_EMAIL
 * account, hashes it with scrypt, updates the database, invalidates ALL active
 * sessions for that account, and creates an audit log entry.
 *
 * The plain-text password is printed ONCE to stdout then discarded — it is
 * NEVER written to disk, logs, or the database.
 *
 * Usage:
 *   node scripts/reset-admin-credentials.js
 *
 * Requirements:
 *   - DATABASE_URL in .env.local (Neon PostgreSQL connection string)
 *   - ADMIN_OWNER_EMAIL in .env.local (defaults to admin@alusmaniorchards.pk)
 *
 * This script is designed for emergency recovery only. After running it,
 * log in to the admin panel and change the password to something memorable
 * through the Security → Change Password page.
 */

'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// ── Load .env.local manually (no dotenv dependency required) ────────────────
function loadEnvFile() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error(`[RESET] ERROR: .env.local not found at ${envPath}`);
    console.error('[RESET] Cannot connect to database without DATABASE_URL.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile();

// ── Password hashing (mirrors src/lib/auth/crypto.ts) ───────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

// ── Generate a strong random password ───────────────────────────────────────
// 16-character password using upper, lower, digits, and safe symbols.
// Guaranteed to contain at least one of each character class.
function generatePassword(length = 16) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$!%^&*-_+=';
  const all = upper + lower + digits + symbols;

  let password;
  do {
    const bytes = crypto.randomBytes(length * 2);
    password = Array.from({ length }, (_, i) => all[bytes[i] % all.length]).join('');
  } while (
    // Ensure all character classes present
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[@#$!%^&*\-_+=]/.test(password)
  );

  return password;
}

// ── Reject common weak passwords (safety check) ──────────────────────────────
const WEAK_PASSWORDS = new Set([
  'password', 'password123', 'admin', 'admin123', '123456', 'qwerty',
  'abc123', 'letmein', '12345678', '111111', 'iloveyou', 'welcome',
  'monkey', 'dragon', 'master', 'sunshine', 'princess', 'shadow'
]);

function isWeakPassword(pwd) {
  return WEAK_PASSWORDS.has(pwd.toLowerCase());
}

// ── Main reset logic ─────────────────────────────────────────────────────────
async function resetAdminCredentials() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[RESET] ERROR: DATABASE_URL is not set in .env.local');
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_OWNER_EMAIL || 'admin@alusmaniorchards.pk';
  console.log(`\n[RESET] ════════════════════════════════════════════════`);
  console.log(`[RESET]  Al Usmani Orchards — Emergency Credential Reset`);
  console.log(`[RESET] ════════════════════════════════════════════════`);
  console.log(`[RESET] Target account: ${adminEmail}`);
  console.log(`[RESET] Database: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`[RESET] Connecting to Neon PostgreSQL...`);

  // Dynamically require @neondatabase/serverless (must be installed)
  let neon;
  try {
    const { neon: neonFn } = require('@neondatabase/serverless');
    neon = neonFn(databaseUrl);
  } catch (err) {
    console.error('[RESET] ERROR: Failed to load @neondatabase/serverless:', err.message);
    console.error('[RESET] Run: npm install @neondatabase/serverless');
    process.exit(1);
  }

  // Verify the target user exists
  const [userRow] = await neon`
    SELECT id, email, name, role, status
    FROM users
    WHERE LOWER(email) = LOWER(${adminEmail})
    LIMIT 1
  `;

  if (!userRow) {
    console.error(`[RESET] ERROR: No user found with email ${adminEmail}`);
    console.error('[RESET] Check ADMIN_OWNER_EMAIL in .env.local');
    process.exit(1);
  }

  if (!['SUPER_ADMIN', 'ADMIN'].includes(userRow.role)) {
    console.error(`[RESET] ERROR: User ${adminEmail} has role ${userRow.role}, not ADMIN/SUPER_ADMIN.`);
    console.error('[RESET] This script only resets admin accounts.');
    process.exit(1);
  }

  console.log(`[RESET] Found: ${userRow.name} (ID: ${userRow.id}, Role: ${userRow.role})`);

  // Generate new password
  const newPassword = generatePassword(16);
  if (isWeakPassword(newPassword)) {
    // Statistically impossible but guard it anyway
    console.error('[RESET] Generated password failed strength check. Run again.');
    process.exit(1);
  }

  const newHash = hashPassword(newPassword);
  console.log(`[RESET] Generated new cryptographic password hash (scrypt).`);

  // Update password in database
  await neon`
    UPDATE users
    SET password_hash = ${newHash}, updated_at = NOW()
    WHERE id = ${userRow.id}
  `;
  console.log(`[RESET] ✓ Password hash updated in database.`);

  // Invalidate ALL active sessions for this user
  const invalidated = await neon`
    UPDATE user_sessions
    SET status = 'REVOKED', expires_at = NOW()
    WHERE user_id = ${userRow.id}
      AND status = 'ACTIVE'
      AND expires_at > NOW()
  `;
  const revokedCount = invalidated.count ?? 0;
  console.log(`[RESET] ✓ Revoked ${revokedCount} active session(s).`);

  // Create audit log entry
  const auditId = crypto.randomUUID();
  await neon`
    INSERT INTO admin_audit_logs (
      id, user_id, user_email, action, resource_type, resource_id,
      ip_address, new_state, created_at
    ) VALUES (
      ${auditId},
      ${userRow.id},
      ${userRow.email},
      'EMERGENCY_PASSWORD_RESET',
      'USER',
      ${userRow.id},
      '127.0.0.1',
      ${JSON.stringify({
        method: 'scripts/reset-admin-credentials.js',
        revoked_sessions: revokedCount,
        timestamp: new Date().toISOString()
      })},
      NOW()
    )
  `;
  console.log(`[RESET] ✓ Audit log created (ID: ${auditId}).`);

  // ── Print credentials ONCE ────────────────────────────────────────────────
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          NEW ADMIN CREDENTIALS — SAVE IMMEDIATELY           ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Email:    ${adminEmail.padEnd(50)} ║`);
  console.log(`║  Password: ${newPassword.padEnd(50)} ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  ⚠  This password will NOT be shown again.                  ║');
  console.log('║  Log in and change it via Admin → Security → Password.      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n[RESET] Reset complete. All previous sessions have been invalidated.\n');
}

resetAdminCredentials().catch((err) => {
  console.error('[RESET] FATAL ERROR:', err);
  process.exit(1);
});
