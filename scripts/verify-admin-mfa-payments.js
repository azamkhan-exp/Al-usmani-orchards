/**
 * Rigorous Verification Suite for Admin Control Center, MFA (TOTP), Session Security,
 * and Multi-Tier Payment System for Al Usmani Orchards.
 */

const { getDatabase } = require('../src/lib/db');
const { ensureDatabaseReady } = require('../src/lib/db/init');
const {
  generateTotpSecret,
  generateTotpUri,
  generateTotpCode,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
  generateTotpQrCodeDataUrl
} = require('../src/lib/auth/totp');
const {
  getAllPaymentMethods,
  getPaymentMethodByCode,
  updatePaymentMethod,
  setProductPaymentOverride,
  determineAvailablePaymentMethods,
  recordPaymentTransaction,
  getPendingVerificationPayments,
  verifyManualPayment
} = require('../src/lib/services/payment.service');
const { createOrder } = require('../src/lib/services/order.service');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('  AL USMANI ORCHARDS - ADMIN MFA & PAYMENT SYSTEM TEST SUITE');
  console.log('===============================================================\n');

  ensureDatabaseReady();
  const db = getDatabase();

  // -------------------------------------------------------------
  // TEST GROUP 1: Database Migration & Schema Integrity
  // -------------------------------------------------------------
  console.log('1. Database Schema & Migration Checks:');
  const userCols = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
  assert(userCols.includes('username'), 'users table contains username column');
  assert(userCols.includes('mfa_enabled'), 'users table contains mfa_enabled column');
  assert(userCols.includes('mfa_secret'), 'users table contains mfa_secret column');
  assert(userCols.includes('mfa_recovery_codes_json'), 'users table contains mfa_recovery_codes_json column');
  assert(userCols.includes('mfa_verified_at'), 'users table contains mfa_verified_at column');

  const adminUser = db.prepare(`SELECT * FROM users WHERE email = 'admin@alusmaniorchards.pk'`).get();
  assert(adminUser !== undefined, 'Admin user admin@alusmaniorchards.pk exists');
  assert(adminUser.username === 'admin', 'Default admin username is "admin"');

  const paymentTables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('payment_methods', 'payment_method_configs', 'product_payment_methods', 'payment_transactions')
  `).all().map(t => t.name);
  assert(paymentTables.includes('payment_methods'), 'payment_methods table exists');
  assert(paymentTables.includes('payment_method_configs'), 'payment_method_configs table exists');
  assert(paymentTables.includes('product_payment_methods'), 'product_payment_methods table exists');
  assert(paymentTables.includes('payment_transactions'), 'payment_transactions table exists');

  // -------------------------------------------------------------
  // TEST GROUP 2: Default Payment Methods & Configs
  // -------------------------------------------------------------
  console.log('\n2. Default Payment Methods Seeding:');
  const methods = getAllPaymentMethods(false);
  const methodCodes = methods.map(m => m.code);
  assert(methodCodes.includes('COD'), 'Default COD method exists');
  assert(methodCodes.includes('EASYPAISA'), 'Default EASYPAISA method exists');
  assert(methodCodes.includes('JAZZCASH'), 'Default JAZZCASH method exists');
  assert(methodCodes.includes('CARD'), 'Default CARD method exists');

  const cod = getPaymentMethodByCode('COD');
  assert(cod.is_enabled === 1, 'COD is enabled globally by default');
  assert(cod.configs && cod.configs.instructions !== undefined, 'COD has instructions configured');

  const ep = getPaymentMethodByCode('EASYPAISA');
  assert(ep.is_enabled === 1, 'EASYPAISA is enabled globally by default');
  assert(ep.configs && ep.configs.account_name === 'Al Usmani Orchards', 'EASYPAISA has account_name configured');

  // -------------------------------------------------------------
  // TEST GROUP 3: RFC 6238 TOTP Engine
  // -------------------------------------------------------------
  console.log('\n3. RFC 6238 TOTP & QR Code Engine:');
  const secret = generateTotpSecret(20);
  assert(typeof secret === 'string' && secret.length >= 32, 'generateTotpSecret returns Base32 secret >= 32 chars');

  const uri = generateTotpUri('admin@alusmaniorchards.pk', secret, 'Al Usmani Orchards');
  assert(uri.startsWith('otpauth://totp/Al%20Usmani%20Orchards:admin%40alusmaniorchards.pk?secret='), 'generateTotpUri generates valid otpauth URI');

  const code = generateTotpCode(secret);
  assert(/^\d{6}$/.test(code), `generateTotpCode produces 6-digit numeric code: ${code}`);

  assert(verifyTotpCode(secret, code), 'verifyTotpCode successfully validates current time code');
  assert(!verifyTotpCode(secret, '000000'), 'verifyTotpCode rejects invalid code 000000');

  // Window tolerance test (-30s, +30s)
  const pastCode = generateTotpCode(secret, -1);
  assert(verifyTotpCode(secret, pastCode, 1), 'verifyTotpCode validates previous 30s code with window=1');
  const futureCode = generateTotpCode(secret, 1);
  assert(verifyTotpCode(secret, futureCode, 1), 'verifyTotpCode validates future 30s code with window=1');

  // Recovery codes test
  const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
  assert(plainCodes.length === 8, 'generateRecoveryCodes creates exactly 8 plain codes');
  assert(hashedCodes.length === 8, 'generateRecoveryCodes creates exactly 8 hashed codes');
  assert(plainCodes[0].includes('-'), `Recovery code format has dash: ${plainCodes[0]}`);

  // Test single-use recovery code consumption
  const storedJson = JSON.stringify(hashedCodes);
  const firstCode = plainCodes[0];
  const consumeRes = verifyAndConsumeRecoveryCode(firstCode, storedJson);
  assert(consumeRes.valid === true, 'First recovery code validates successfully');
  
  // Test replay / reuse prevention
  const reuseRes = verifyAndConsumeRecoveryCode(firstCode, consumeRes.updatedCodesJson);
  assert(reuseRes.valid === false, 'Consumed recovery code cannot be reused (burn-on-use enforced)');

  // QR code generation test
  const qrDataUrl = await generateTotpQrCodeDataUrl(uri);
  assert(qrDataUrl.startsWith('data:image/png;base64,'), 'generateTotpQrCodeDataUrl produces valid Base64 PNG image');

  // -------------------------------------------------------------
  // TEST GROUP 4: Two-Level Payment Precedence & Mixed-Cart Rules
  // -------------------------------------------------------------
  console.log('\n4. Two-Level Payment Precedence & Mixed-Cart Rule:');
  
  // Pick two test products
  const products = db.prepare('SELECT id FROM products LIMIT 2').all();
  if (products.length >= 2) {
    const prodA = products[0].id;
    const prodB = products[1].id;

    // A: When all inherit global, COD is available
    const availableNormal = determineAvailablePaymentMethods([prodA, prodB]);
    assert(availableNormal.some(m => m.code === 'COD'), 'COD is available when both products INHERIT global enabled');

    // B: Product Override - Disable COD on Product A
    setProductPaymentOverride(prodA, 'COD', 'DISABLED');
    setProductPaymentOverride(prodB, 'COD', 'INHERIT');

    // Single item cart with Prod A -> COD disallowed
    const cartProdA = determineAvailablePaymentMethods([prodA]);
    assert(!cartProdA.some(m => m.code === 'COD'), 'COD disallowed for single-item cart with Prod A (override=DISABLED)');

    // Single item cart with Prod B -> COD allowed
    const cartProdB = determineAvailablePaymentMethods([prodB]);
    assert(cartProdB.some(m => m.code === 'COD'), 'COD allowed for single-item cart with Prod B (override=INHERIT)');

    // Mixed cart (Prod A + Prod B) -> COD disallowed because Prod A disallows it!
    const mixedCart = determineAvailablePaymentMethods([prodA, prodB]);
    assert(!mixedCart.some(m => m.code === 'COD'), 'MIXED CART: COD disallowed for mixed cart because Prod A disallows it');

    // Reset override back to INHERIT
    setProductPaymentOverride(prodA, 'COD', 'INHERIT');
    const resetCart = determineAvailablePaymentMethods([prodA, prodB]);
    assert(resetCart.some(m => m.code === 'COD'), 'COD restored after resetting Prod A to INHERIT');

    // C: Global disabled override
    updatePaymentMethod('COD', false);
    setProductPaymentOverride(prodA, 'COD', 'ENABLED'); // Even if product tries to enable it!
    const globalDisabledCart = determineAvailablePaymentMethods([prodA]);
    assert(!globalDisabledCart.some(m => m.code === 'COD'), 'Global disabled overrides product ENABLED status');

    // Re-enable global COD
    updatePaymentMethod('COD', true);
    setProductPaymentOverride(prodA, 'COD', 'INHERIT');
  }

  // -------------------------------------------------------------
  // TEST GROUP 5: Authoritative Server-Side Checkout Validation
  // -------------------------------------------------------------
  console.log('\n5. Server-Side Checkout Validation:');

  const pkg = db.prepare('SELECT id, product_id FROM package_sizes WHERE is_active = 1 LIMIT 1').get();
  if (pkg) {
    // 5a. Attempt checkout with disabled payment method (CARD is disabled globally)
    const invalidCheckout = createOrder({
      items: [{ packageSizeId: pkg.id, quantity: 1 }],
      customer: {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '03001234567',
        city: 'Lahore',
        address: '123 Test Street'
      },
      paymentMethod: 'CARD' // Globally disabled!
    });
    assert(invalidCheckout.success === false, 'Checkout correctly rejected globally disabled payment method CARD');
    assert(invalidCheckout.error && invalidCheckout.error.includes('unavailable'), 'Correct informative error returned on unavailable payment method');

    // 5b. Successful checkout with EasyPaisa + TID
    const epCheckout = createOrder({
      items: [{ packageSizeId: pkg.id, quantity: 1 }],
      customer: {
        name: 'TID Test Customer',
        email: 'tidtest@example.com',
        phone: '03001234567',
        city: 'Lahore',
        address: '456 Gulberg III'
      },
      paymentMethod: 'EASYPAISA',
      paymentReference: 'EP-TID-9876543210'
    });
    assert(epCheckout.success === true, 'Checkout with EASYPAISA and TID succeeds');
    assert(epCheckout.orderNumber !== undefined, `Created Order ${epCheckout.orderNumber}`);

    // Check order payment status in DB
    const orderInDb = db.prepare('SELECT payment_status, payment_method FROM orders WHERE id = ?').get(epCheckout.orderId);
    assert(orderInDb.payment_status === 'AWAITING_VERIFICATION', 'Order payment_status is AWAITING_VERIFICATION for EasyPaisa');
    assert(orderInDb.payment_method === 'EASYPAISA', 'Order payment_method is EASYPAISA');

    // Check payment_transactions table
    const txInDb = db.prepare('SELECT * FROM payment_transactions WHERE order_id = ?').get(epCheckout.orderId);
    assert(txInDb !== undefined, 'Payment transaction record created in payment_transactions table');
    assert(txInDb.status === 'AWAITING_VERIFICATION', 'Payment transaction status is AWAITING_VERIFICATION');
    assert(txInDb.transaction_reference === 'EP-TID-9876543210', 'Payment transaction reference matches customer TID');

    // -------------------------------------------------------------
    // TEST GROUP 6: Admin Manual Payment Verification Workflow
    // -------------------------------------------------------------
    console.log('\n6. Admin Manual Payment Verification & Reconciliation:');
    const pendingList = getPendingVerificationPayments();
    assert(pendingList.some(p => p.order_id === epCheckout.orderId), 'Order appears in getPendingVerificationPayments queue');

    // Approve payment as admin
    const verifySuccess = verifyManualPayment(txInDb.id, adminUser.id, true, 'Verified against EasyPaisa merchant portal');
    assert(verifySuccess === true, 'verifyManualPayment succeeds for admin approval');

    const updatedOrder = db.prepare('SELECT payment_status FROM orders WHERE id = ?').get(epCheckout.orderId);
    assert(updatedOrder.payment_status === 'PAID', 'Order payment_status transitioned to PAID after admin approval');

    const updatedTx = db.prepare('SELECT status, verified_by, admin_notes FROM payment_transactions WHERE id = ?').get(txInDb.id);
    assert(updatedTx.status === 'PAID', 'Transaction status transitioned to PAID');
    assert(updatedTx.verified_by === adminUser.id, 'Transaction recorded verified_by admin user ID');
  }

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passedTests} passed, ${failedTests} failed.`);
  console.log('===============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
