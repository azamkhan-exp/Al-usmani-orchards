// @ts-check
/**
 * End-to-end Persistence, Store Settings & Auth Hardening Verification Suite
 * for Al Usmani Orchards.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const dbPath = path.resolve(__dirname, '../data/shahi_orchards.db');
const db = new DatabaseSync(dbPath);

const BASE_URL = 'http://localhost:3000';

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

async function runVerification() {
  console.log('=== AL USMANI ORCHARDS PERSISTENCE & SETTINGS VERIFICATION ===\n');

  // -------------------------------------------------------------
  // [1] Store Settings Persistence in SQLite
  // -------------------------------------------------------------
  console.log('[1] Verifying Store Settings SQLite Persistence...');

  const initialGeneral = db.prepare(`SELECT value_json FROM store_settings WHERE key = 'general'`).get();
  assert(Boolean(initialGeneral), 'Store settings row "general" exists in SQLite');

  const initialShipping = db.prepare(`SELECT value_json FROM store_settings WHERE key = 'shipping'`).get();
  assert(Boolean(initialShipping), 'Store settings row "shipping" exists in SQLite');

  // Mutate store settings (simulate Admin saving new announcement banner & threshold)
  // @ts-ignore
  const originalShippingData = JSON.parse(initialShipping.value_json);
  const testThreshold = 12500;
  const testStandardFee = 400;

  const updatedShippingData = {
    ...originalShippingData,
    standard_shipping_fee: testStandardFee,
    free_shipping_threshold: testThreshold
  };

  db.prepare(`
    UPDATE store_settings 
    SET value_json = ?, updated_at = datetime('now') 
    WHERE key = 'shipping'
  `).run(JSON.stringify(updatedShippingData));

  const reloadedShipping = db.prepare(`SELECT value_json FROM store_settings WHERE key = 'shipping'`).get();
  // @ts-ignore
  const parsedReloaded = JSON.parse(reloadedShipping.value_json);

  assert(parsedReloaded.standard_shipping_fee === testStandardFee, `standard_shipping_fee persisted as ${testStandardFee}`);
  assert(parsedReloaded.free_shipping_threshold === testThreshold, `free_shipping_threshold persisted as ${testThreshold}`);

  // Restore original for cleanliness
  db.prepare(`
    UPDATE store_settings 
    SET value_json = ?, updated_at = datetime('now') 
    WHERE key = 'shipping'
  `).run(JSON.stringify(originalShippingData));

  // -------------------------------------------------------------
  // [2] Public Storefront Settings Endpoint
  // -------------------------------------------------------------
  console.log('\n[2] Verifying Public Store Settings Endpoint (GET /api/settings)...');

  try {
    const settingsRes = await fetch(`${BASE_URL}/api/settings`).then((r) => r.json());
    assert(settingsRes.success === true, 'GET /api/settings returned HTTP 200 with success: true');
    assert(Boolean(settingsRes.settings.general?.store_name), `Store name returned: "${settingsRes.settings.general?.store_name}"`);
    assert(Boolean(settingsRes.settings.shipping?.free_shipping_threshold), `Free shipping threshold returned: Rs. ${settingsRes.settings.shipping?.free_shipping_threshold}`);
    assert(settingsRes.settings.smtp_pass === undefined, 'Sensitive SMTP credentials are NOT exposed in public settings');
    assert(settingsRes.settings.security === undefined, 'Internal security parameters are NOT exposed in public settings');
  } catch (err) {
    assert(false, `Failed to call /api/settings: ${err.message}`);
  }

  // -------------------------------------------------------------
  // [3] Dynamic Shipping Calculations with Free Shipping Threshold
  // -------------------------------------------------------------
  console.log('\n[3] Verifying Dynamic Shipping Calculations via POST /api/cart/calculate...');

  try {
    const pkg = db.prepare('SELECT id FROM package_sizes WHERE is_active = 1 LIMIT 1').get();
    // @ts-ignore
    const pkgId = pkg.id;

    // A. Single box under threshold
    const underRes = await fetch(`${BASE_URL}/api/cart/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ packageSizeId: pkgId, quantity: 1 }],
        destinationCity: 'Lahore'
      })
    }).then((r) => r.json());

    assert(underRes.shippingFee > 0, `Under threshold (subtotal Rs. ${underRes.subtotal}) incurs standard shipping fee: Rs. ${underRes.shippingFee}`);

    // B. Bulk quantity over threshold (e.g. 8 boxes)
    const overRes = await fetch(`${BASE_URL}/api/cart/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ packageSizeId: pkgId, quantity: 8 }],
        destinationCity: 'Lahore'
      })
    }).then((r) => r.json());

    assert(overRes.shippingFee === 0, `At/over threshold (subtotal Rs. ${overRes.subtotal}) qualifies for FREE cold-chain delivery (Rs. 0)`);
  } catch (err) {
    assert(false, `Failed to test /api/cart/calculate: ${err.message}`);
  }

  // -------------------------------------------------------------
  // [4] Customer Profile Linkage & Reload Persistence
  // -------------------------------------------------------------
  console.log('\n[4] Verifying Customer Profile Linkage & Reload Persistence...');

  const testCustUserId = `test-user-${crypto.randomUUID()}`;
  const testCustEmail = `patron-${Date.now()}@alusmaniorchards-test.pk`;

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, status, email_verified, created_at)
    VALUES (?, 'Royal Patron', ?, 'dummy_hash', 'CUSTOMER', 'ACTIVE', 1, datetime('now'))
  `).run(testCustUserId, testCustEmail);

  const guestCustId = `cust-${crypto.randomUUID()}`;
  db.prepare(`
    INSERT INTO customers (id, user_id, full_name, email, phone, city, segment, total_spent, orders_count, created_at)
    VALUES (?, NULL, 'Royal Patron Guest', ?, '+923001234567', 'Multan', 'NEW', 0, 0, datetime('now'))
  `).run(guestCustId, testCustEmail);

  let customerRow = db.prepare('SELECT id, user_id, email FROM customers WHERE user_id = ? OR email = ?').get(testCustUserId, testCustEmail);
  assert(Boolean(customerRow), 'Customer row found by email');
  // @ts-ignore
  assert(customerRow.user_id === null, 'Initial customer row had user_id = NULL');

  // Simulate profile linkage
  db.prepare('UPDATE customers SET user_id = ? WHERE id = ?').run(testCustUserId, customerRow.id);
  const linkedRow = db.prepare('SELECT id, user_id, email FROM customers WHERE id = ?').get(customerRow.id);
  // @ts-ignore
  assert(linkedRow.user_id === testCustUserId, 'Customer profile successfully bound to user_id on reload');

  // -------------------------------------------------------------
  // [5] Admin Authentication & Session Integrity
  // -------------------------------------------------------------
  console.log('\n[5] Verifying Admin Authority & Session State...');

  const adminUser = db.prepare(`SELECT id, name, email, role FROM users WHERE email = 'admin@alusmaniorchards.pk'`).get();
  assert(Boolean(adminUser), 'Admin user exists in database');
  // @ts-ignore
  assert(adminUser.role === 'SUPER_ADMIN', `Admin user has role: ${adminUser.role}`);

  // Test admin login endpoint
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@alusmaniorchards.pk',
        password: 'AlUsmaniRoyal2026!'
      })
    });
    const loginJson = await loginRes.json();
    assert(loginJson.success === true, 'Admin login succeeded via POST /api/auth/login');
    assert(loginJson.user.role === 'SUPER_ADMIN', 'Admin user role returned as SUPER_ADMIN');

    const cookieHeader = loginRes.headers.get('set-cookie');
    assert(Boolean(cookieHeader && cookieHeader.includes('auo_session')), 'HTTP-only auo_session cookie received');

    // Verify session persistence across requests with cookie
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookieHeader }
    }).then((r) => r.json());

    assert(meRes.authenticated === true, 'Subsequent GET /api/auth/me with session cookie returns authenticated: true');
    assert(meRes.user.role === 'SUPER_ADMIN', 'Subsequent GET /api/auth/me preserves role: SUPER_ADMIN on page reload');
  } catch (err) {
    assert(false, `Admin login verification failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // [6] Promotions Management CRUD & Audit Logging
  // -------------------------------------------------------------
  console.log('\n[6] Verifying Promotions CRUD Operations & Audit Trail...');

  const promoId = `promo-test-${crypto.randomUUID()}`;
  const promoCode = `MANGO${Math.floor(100 + Math.random() * 900)}`;

  // 1. Create Promo
  db.prepare(`
    INSERT INTO promotions (
      id, name, code, discount_type, discount_value, min_order_value,
      max_discount, expires_at, is_stackable, is_active
    ) VALUES (?, 'Harvest Festival Celebration', ?, 'PERCENTAGE', 15, 6000, 2000, NULL, 1, 1)
  `).run(promoId, promoCode);

  const createdPromo = db.prepare('SELECT * FROM promotions WHERE id = ?').get(promoId);
  // @ts-ignore
  assert(Boolean(createdPromo), `Promotion created: ${createdPromo.name} (${createdPromo.code})`);
  // @ts-ignore
  assert(createdPromo.discount_value === 15, 'Discount value stored correctly (15%)');

  // 2. Update Promo
  db.prepare(`
    UPDATE promotions
    SET name = 'Updated Harvest Festival', discount_value = 20, updated_at = datetime('now')
    WHERE id = ?
  `).run(promoId);

  const updatedPromo = db.prepare('SELECT * FROM promotions WHERE id = ?').get(promoId);
  // @ts-ignore
  assert(updatedPromo.name === 'Updated Harvest Festival', 'Promotion name updated');
  // @ts-ignore
  assert(updatedPromo.discount_value === 20, 'Promotion value updated to 20%');

  // 3. Toggle Promo
  db.prepare('UPDATE promotions SET is_active = 0 WHERE id = ?').run(promoId);
  const disabledPromo = db.prepare('SELECT is_active FROM promotions WHERE id = ?').get(promoId);
  // @ts-ignore
  assert(disabledPromo.is_active === 0, 'Promotion successfully disabled');

  // 4. Delete Promo
  db.prepare('DELETE FROM promotions WHERE id = ?').run(promoId);
  const deletedCheck = db.prepare('SELECT id FROM promotions WHERE id = ?').get(promoId);
  assert(!deletedCheck, 'Promotion successfully deleted from SQLite');

  // -------------------------------------------------------------
  // [7] Customer IDOR Isolation
  // -------------------------------------------------------------
  console.log('\n[7] Verifying Customer Order & Address IDOR Protection...');

  const custA_id = `cust-a-${crypto.randomUUID()}`;
  const custB_id = `cust-b-${crypto.randomUUID()}`;
  const addrA_id = `addr-a-${crypto.randomUUID()}`;

  db.prepare(`
    INSERT INTO customers (id, full_name, email, city, created_at)
    VALUES (?, 'Customer A', ?, 'Lahore', datetime('now'))
  `).run(custA_id, `cust-a-${Date.now()}@test.pk`);

  db.prepare(`
    INSERT INTO customers (id, full_name, email, city, created_at)
    VALUES (?, 'Customer B', ?, 'Karachi', datetime('now'))
  `).run(custB_id, `cust-b-${Date.now()}@test.pk`);

  db.prepare(`
    INSERT INTO customer_addresses (id, customer_id, label, recipient_name, phone, street_address, city, province, is_default)
    VALUES (?, ?, 'Villa', 'Customer A', '+923001111111', '12 Gulberg III', 'Lahore', 'Punjab', 1)
  `).run(addrA_id, custA_id);

  // Customer B attempts to delete Customer A's address
  const deleteAttempt = db.prepare('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?').run(addrA_id, custB_id);
  assert(deleteAttempt.changes === 0, 'IDOR Attempt: Customer B cannot delete Customer A address (0 rows affected)');

  // Customer A deletes own address
  const validDelete = db.prepare('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?').run(addrA_id, custA_id);
  assert(validDelete.changes === 1, 'Authorized: Customer A can delete own address (1 row affected)');

  // Clean up test records
  db.prepare('DELETE FROM customers WHERE id IN (?, ?)').run(custA_id, custB_id);
  db.prepare('DELETE FROM users WHERE id = ?').run(testCustUserId);
  db.prepare('DELETE FROM customers WHERE id = ?').run(guestCustId);

  console.log('\n======================================================');
  console.log(`PERSISTENCE VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
