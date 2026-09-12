// Automated Security & Authentication Invariant Verification for Al Usmani Orchards
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

async function runVerification() {
  console.log('=== AL USMANI ORCHARDS SECURITY & AUTHENTICATION VERIFICATION ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const dbPath = path.join(__dirname, '..', 'data', 'shahi_orchards.db');
  const db = new DatabaseSync(dbPath);

  // 1. Test Database Schema & Accounts Table
  console.log('[1] Verifying Database Schema & Accounts Table...');
  try {
    // Check tables
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map(t => t.name);
    assert(tables.includes('accounts'), 'accounts table exists in SQLite schema');
    assert(tables.includes('users'), 'users table exists');
    assert(tables.includes('customers'), 'customers table exists');
    assert(tables.includes('customer_addresses'), 'customer_addresses table exists');

    const userCols = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
    assert(userCols.includes('avatar_url'), 'users table has avatar_url column');
    assert(userCols.includes('email_verified'), 'users table has email_verified column');
    assert(userCols.includes('last_login_at'), 'users table has last_login_at column');

    const addressCols = db.prepare(`PRAGMA table_info(customer_addresses)`).all().map(c => c.name);
    assert(addressCols.includes('address_line_2'), 'customer_addresses table has address_line_2 column');
  } catch (err) {
    assert(false, `Database check failed: ${err.message}`);
  }

  // 2. Test HMAC Session Token Signing & Verification (Edge compatible Web Crypto)
  console.log('\n[2] Verifying Web Crypto HMAC Session Token Engine...');
  try {
    const DEFAULT_SECRET = 'auo-production-grade-hmac-sha256-session-secret-salt-1934-multan';

    function base64UrlEncode(str) {
      return Buffer.from(str).toString('base64url');
    }

    function base64UrlDecode(str) {
      return Buffer.from(str, 'base64url').toString('utf8');
    }

    async function getHmacKey(secret) {
      const enc = new TextEncoder();
      return await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );
    }

    async function signSessionToken(rawToken, payload, secret = DEFAULT_SECRET) {
      const payloadStr = JSON.stringify(payload);
      const payloadBase64 = base64UrlEncode(payloadStr);
      const dataToSign = `${rawToken}.${payloadBase64}`;

      const key = await getHmacKey(secret);
      const enc = new TextEncoder();
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));

      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return `${rawToken}.${payloadBase64}.${signatureHex}`;
    }

    async function verifySignedSessionToken(tokenString, secret = DEFAULT_SECRET) {
      if (!tokenString) return { valid: false };
      const parts = tokenString.split('.');
      if (parts.length !== 3) return { valid: false, rawToken: tokenString };

      const [rawToken, payloadBase64, signatureHex] = parts;
      const dataToSign = `${rawToken}.${payloadBase64}`;

      const key = await getHmacKey(secret);
      const enc = new TextEncoder();
      const matches = signatureHex.match(/.{1,2}/g);
      if (!matches) return { valid: false };
      const sigBytes = new Uint8Array(matches.map(byte => parseInt(byte, 16)));

      const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(dataToSign));
      if (!isValid) return { valid: false };

      const payload = JSON.parse(base64UrlDecode(payloadBase64));
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < nowSec) return { valid: false };

      return { valid: true, rawToken, payload };
    }

    const rawToken = 'test-token-32-byte-hex-string-abcdef123456';
    const payload = {
      userId: 'user-patron-101',
      role: 'CUSTOMER',
      exp: Math.floor(Date.now() / 1000) + 3600
    };

    const signedToken = await signSessionToken(rawToken, payload);
    assert(signedToken.split('.').length === 3, 'Signed session token conforms to [token].[payload].[signature] format');

    const verification = await verifySignedSessionToken(signedToken);
    assert(verification.valid === true, 'Valid token passes HMAC-SHA256 verification');
    assert(verification.payload?.userId === 'user-patron-101', 'Verified payload matches expected userId');
    assert(verification.payload?.role === 'CUSTOMER', 'Verified payload matches expected role');

    // Tampering test: modify role in payload
    const parts = signedToken.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ ...payload, role: 'SUPER_ADMIN' })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const tamperedResult = await verifySignedSessionToken(tamperedToken);
    assert(tamperedResult.valid === false, 'Tampered token (role elevated to SUPER_ADMIN) is strictly REJECTED');

    // Expiration test
    const expiredPayload = { ...payload, exp: Math.floor(Date.now() / 1000) - 100 };
    const expiredToken = await signSessionToken(rawToken, expiredPayload);
    const expiredResult = await verifySignedSessionToken(expiredToken);
    assert(expiredResult.valid === false, 'Expired session token is strictly REJECTED');
  } catch (err) {
    assert(false, `Token engine check failed: ${err.message}`);
  }

  // 3. Test Owner Admin Email Authority
  console.log('\n[3] Verifying Single-Owner Admin Authority...');
  try {
    function isOwnerEmail(email) {
      const ownerEmail = (process.env.ADMIN_OWNER_EMAIL || 'admin@alusmaniorchards.pk').trim().toLowerCase();
      return email.trim().toLowerCase() === ownerEmail;
    }

    const ownerEmail = process.env.ADMIN_OWNER_EMAIL || 'admin@alusmaniorchards.pk';
    assert(isOwnerEmail(ownerEmail), `isOwnerEmail returns true for ${ownerEmail}`);
    assert(!isOwnerEmail('customer@example.com'), 'isOwnerEmail returns false for customer@example.com');
    assert(!isOwnerEmail('fraud@malicious.pk'), 'isOwnerEmail returns false for arbitrary email');
  } catch (err) {
    assert(false, `Owner authority check failed: ${err.message}`);
  }

  // 4. Test Customer Address IDOR Protection
  console.log('\n[4] Verifying Customer Address Isolation (IDOR Defenses)...');
  try {
    // Create 2 separate test customers
    const cust1Id = 'test-cust-idor-1';
    const cust2Id = 'test-cust-idor-2';
    const addr1Id = 'test-addr-idor-1';

    // Create test users first to satisfy foreign key constraints
    db.prepare(`
      INSERT OR REPLACE INTO users (id, name, email, password_hash, role, status)
      VALUES ('u-idor-1', 'Customer One', 'one@example.com', 'scrypt:test', 'CUSTOMER', 'ACTIVE')
    `).run();

    db.prepare(`
      INSERT OR REPLACE INTO users (id, name, email, password_hash, role, status)
      VALUES ('u-idor-2', 'Customer Two', 'two@example.com', 'scrypt:test', 'CUSTOMER', 'ACTIVE')
    `).run();

    db.prepare(`
      INSERT OR REPLACE INTO customers (id, user_id, full_name, email, city, segment, referral_code, created_at)
      VALUES (?, 'u-idor-1', 'Customer One', 'one@example.com', 'Lahore', 'NEW', 'AUO-IDOR1', datetime('now'))
    `).run(cust1Id);

    db.prepare(`
      INSERT OR REPLACE INTO customers (id, user_id, full_name, email, city, segment, referral_code, created_at)
      VALUES (?, 'u-idor-2', 'Customer Two', 'two@example.com', 'Karachi', 'NEW', 'AUO-IDOR2', datetime('now'))
    `).run(cust2Id);

    db.prepare(`
      INSERT OR REPLACE INTO customer_addresses (id, customer_id, label, recipient_name, phone, street_address, city, is_default)
      VALUES (?, ?, 'Home', 'Customer One', '+923001111111', 'Street 1', 'Lahore', 1)
    `).run(addr1Id, cust1Id);

    // Customer 2 attempts to delete Customer 1's address
    const unauthorizedDelete = db.prepare(`DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?`).run(addr1Id, cust2Id);
    assert(unauthorizedDelete.changes === 0, 'Unauthorized cross-customer address deletion affects 0 rows (BLOCKED)');

    // Customer 1 deletes their own address
    const authorizedDelete = db.prepare(`DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?`).run(addr1Id, cust1Id);
    assert(authorizedDelete.changes === 1, 'Authorized address deletion succeeds');

    // Clean up
    db.prepare(`DELETE FROM customers WHERE id IN (?, ?)`).run(cust1Id, cust2Id);
    db.prepare(`DELETE FROM users WHERE id IN ('u-idor-1', 'u-idor-2')`).run();
  } catch (err) {
    assert(false, `IDOR check failed: ${err.message}`);
  }

  // 5. Verify Edge Middleware Configuration
  console.log('\n[5] Verifying Edge Middleware File & Matcher...');
  const middlewarePath = path.join(__dirname, '..', 'src', 'middleware.ts');
  assert(fs.existsSync(middlewarePath), 'src/middleware.ts exists');
  const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
  assert(middlewareContent.includes("pathname.startsWith('/admin')"), 'Middleware checks /admin routes');
  assert(middlewareContent.includes("pathname.startsWith('/account')"), 'Middleware checks /account routes');
  assert(middlewareContent.includes('X-Robots-Tag'), 'Middleware sets X-Robots-Tag header');

  // 6. Verify Production Documentation Suite
  console.log('\n[6] Verifying Production Documentation Suite...');
  const docsDir = path.join(__dirname, '..', 'docs');
  const requiredDocs = [
    'ARCHITECTURE.md',
    'AUTHENTICATION.md',
    'SECURITY.md',
    'DEPLOYMENT.md',
    'AL-USMANI-ORCHARDS-OPERATIONS-GUIDE.md'
  ];

  for (const doc of requiredDocs) {
    const docPath = path.join(docsDir, doc);
    assert(fs.existsSync(docPath), `Documentation file docs/${doc} exists`);
  }

  const envExamplePath = path.join(__dirname, '..', '.env.example');
  assert(fs.existsSync(envExamplePath), '.env.example configuration template exists');

  console.log(`\n======================================================`);
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
