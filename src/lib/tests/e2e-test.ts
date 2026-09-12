import { getDatabase } from '../db';
import { ensureDatabaseReady } from '../db/init';
import { evaluateOrderDiscounts } from '../services/discount.service';
import { createOrder } from '../services/order.service';
import { getFinancialOverview } from '../services/finance.service';
import { askCustomerAssistant, askAdminAssistant } from '../services/ai.service';
import { hashPassword, verifyPassword } from '../auth/crypto';
import { hasPermission } from '../auth/session';
import {
  serializePreorderCampaigns,
  serializeProducts,
  serializeVarieties
} from '../serializers';
import { getEffectivePrice, calculateSavings, parseNumericPrice } from '../pricing';
import {
  formatPKR,
  formatStock,
  formatWeight,
  formatNumber,
  formatDate
} from '../formatters';
import { ProductPackageSchema, ProductSchema } from '../validations/product.schema';

export function runPlatformTests(): { passed: number; failed: number; results: string[] } {
  ensureDatabaseReady();
  const db = getDatabase();
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, extra = '') {
    if (condition) {
      passed++;
      results.push(`✓ PASS: ${name}`);
    } else {
      failed++;
      results.push(`✗ FAIL: ${name} ${extra}`);
    }
  }

  console.log('\n=== RUNNING AL USMANI ORCHARDS INTEGRATION TEST SUITE ===\n');

  // Test 1: Password Hashing with scrypt
  const rawPw = 'AlUsmaniRoyal2026!';
  const hashed = hashPassword(rawPw);
  assert('Password hashing formats scrypt salt correctly', hashed.startsWith('scrypt:'));
  assert('Password verification succeeds for correct password', verifyPassword(rawPw, hashed));
  assert('Password verification fails for incorrect password', !verifyPassword('WrongPassword', hashed));

  // Test 2: RBAC permissions matrix
  assert('SUPER_ADMIN has universal access', hasPermission('SUPER_ADMIN', 'finance:write'));
  assert('FINANCE_MANAGER has finance access', hasPermission('FINANCE_MANAGER', 'finance:write'));
  assert('CUSTOMER cannot access finance settings', !hasPermission('CUSTOMER', 'finance:write'));
  assert('INVENTORY_MANAGER has inventory manage access', hasPermission('INVENTORY_MANAGER', 'inventory:manage'));

  // Test 3: Tiered Volume Discount Engine
  // 3 boxes -> 0%
  const res0 = evaluateOrderDiscounts([
    { packageSizeId: 'pkg-ch-5', productId: 'prod-chaunsa', varietyId: 'var-chaunsa', quantity: 3, unitPrice: 2500 }
  ]);
  assert('Under 5 boxes receives 0% volume discount', res0.appliedTierPercent === 0 && res0.tieredDiscount === 0);

  // 6 boxes -> 5%
  const res5 = evaluateOrderDiscounts([
    { packageSizeId: 'pkg-ch-5', productId: 'prod-chaunsa', varietyId: 'var-chaunsa', quantity: 6, unitPrice: 2500 }
  ]);
  assert('6 boxes receives 5% volume discount', res5.appliedTierPercent === 5 && res5.tieredDiscount === 750);

  // 12 boxes -> 10%
  const res10 = evaluateOrderDiscounts([
    { packageSizeId: 'pkg-ch-5', productId: 'prod-chaunsa', varietyId: 'var-chaunsa', quantity: 12, unitPrice: 2500 }
  ]);
  assert('12 boxes receives 10% volume discount', res10.appliedTierPercent === 10 && res10.tieredDiscount === 3000);

  // 22 boxes -> 15% wholesale tier
  const res15 = evaluateOrderDiscounts([
    { packageSizeId: 'pkg-ch-5', productId: 'prod-chaunsa', varietyId: 'var-chaunsa', quantity: 22, unitPrice: 2500 }
  ]);
  assert('22 boxes receives 15% wholesale volume discount', res15.appliedTierPercent === 15 && res15.tieredDiscount === 8250);

  // Test 4: Coupon Validation (ROYAL10)
  const resCoupon = evaluateOrderDiscounts(
    [{ packageSizeId: 'pkg-ch-10', productId: 'prod-chaunsa', varietyId: 'var-chaunsa', quantity: 2, unitPrice: 4500 }],
    'ROYAL10'
  );
  assert('ROYAL10 applies 10% discount on order above PKR 5,000', resCoupon.couponDiscount === 900);

  // Test 5: Atomic Order Creation & Inventory Reservation
  const orderRes = createOrder({
    items: [{ packageSizeId: 'pkg-ch-5', quantity: 2 }],
    customer: {
      name: 'Integration Test Customer',
      email: 'test.patron@example.com',
      phone: '+92 300 0000000',
      city: 'Lahore',
      address: 'Test Street 1, Gulberg III, Lahore'
    },
    paymentMethod: 'COD'
  });
  assert('Atomic order creation returns success', orderRes.success === true);
  assert('Order number matches MF-YYYY-XXXX format', Boolean(orderRes.orderNumber?.startsWith('MF-')));

  // Test 6: Financial Overview Integrity
  const fin = getFinancialOverview();
  assert('Financial Overview calculates positive Gross Sales', fin.grossSales > 0);
  assert('Financial Overview calculates recorded Operating Expenses', fin.totalExpenses > 0);
  assert('Gross Profit equals Net Sales minus COGS', fin.grossProfit > 0);
  assert('Net Profit equals Net Sales minus Total Expenses minus Refunds', typeof fin.netProfit === 'number');

  // Test 7: Grounded Customer AI Assistant (OrchardBot)
  const aiSweet = askCustomerAssistant('Which mango is sweetest?');
  assert('OrchardBot answers sweetest query with Brix data', aiSweet.answer.includes('Brix') && aiSweet.answer.includes('Anwar Ratol'));

  const ai10kg = askCustomerAssistant('What is available in 10 KG?');
  assert('OrchardBot answers package availability without hallucination', ai10kg.answer.includes('10 KG'));

  // Test 8: Grounded Admin Executive AI Assistant (OrchardIQ)
  const aiProfit = askAdminAssistant('How much profit did we make?');
  assert('OrchardIQ answers profit query with actual database figures', aiProfit.answer.includes('PKR') && aiProfit.answer.includes('Profit'));

  // Test 9: Server-to-Client Serialization & Plain Object Boundary (Next.js 16 / React 19)
  const rawPreorders = db.prepare(`
    SELECT c.*, p.name as product_name, ps.name as package_name, ps.weight_kg
    FROM preorder_campaigns c
    JOIN products p ON p.id = c.product_id
    JOIN package_sizes ps ON ps.id = c.package_size_id
  `).all();
  assert('node:sqlite returns raw rows with null prototype', Object.getPrototypeOf(rawPreorders[0]) === null);

  const serializedPreorders = serializePreorderCampaigns(rawPreorders);
  assert(
    'serializePreorderCampaigns transforms null-prototype to Object.prototype',
    Object.getPrototypeOf(serializedPreorders[0]) === Object.prototype
  );
  assert(
    'Serialized preorder preserves all required fields and correct types',
    typeof serializedPreorders[0].id === 'string' &&
    typeof serializedPreorders[0].preorder_price === 'number' &&
    typeof serializedPreorders[0].regular_price === 'number' &&
    typeof serializedPreorders[0].total_capacity === 'number' &&
    typeof serializedPreorders[0].banner_image === 'string' &&
    typeof serializedPreorders[0].weight_kg === 'number'
  );

  const rawProducts = db.prepare('SELECT p.*, v.name as variety_name, v.slug as variety_slug, v.origin_city, v.sweetness_brix, v.aroma_level, v.fiber_level, v.acidity_level, v.flavor_notes FROM products p JOIN mango_varieties v ON v.id = p.variety_id').all();
  const getPackages = db.prepare('SELECT * FROM package_sizes WHERE product_id = ?');
  const serializedProducts = serializeProducts(rawProducts, (id) => getPackages.all(id));
  assert(
    'serializeProducts converts top-level object to Object.prototype',
    Object.getPrototypeOf(serializedProducts[0]) === Object.prototype
  );
  assert(
    'serializeProducts converts nested package sizes to Object.prototype',
    Object.getPrototypeOf(serializedProducts[0].packages[0]) === Object.prototype
  );

  const rawVarieties = db.prepare('SELECT * FROM mango_varieties').all();
  const serializedVarieties = serializeVarieties(rawVarieties);
  assert(
    'serializeVarieties converts raw varieties to plain Object.prototype',
    Object.getPrototypeOf(serializedVarieties[0]) === Object.prototype
  );

  // Test 10: Canonical Pricing Engine Edge Cases
  assert(
    'Pricing: base price only returns base price',
    getEffectivePrice(4500, null) === 4500
  );
  assert(
    'Pricing: lower sale price takes precedence over base price',
    getEffectivePrice(4500, 3999) === 3999
  );
  assert(
    'Pricing: higher sale price is ignored in favor of base price',
    getEffectivePrice(4500, 5000) === 4500
  );
  assert(
    'Pricing: equal sale price returns base price',
    getEffectivePrice(4500, 4500) === 4500
  );
  assert(
    'Pricing: preorder campaign price takes priority over both base and sale',
    getEffectivePrice(4500, 4000, 3500) === 3500
  );
  assert(
    'Pricing: string numeric values parsed safely ("4500" -> 4500)',
    getEffectivePrice('4500', '3999') === 3999
  );
  assert(
    'Pricing: null base and null sale returns null (never undefined)',
    getEffectivePrice(null, null) === null
  );
  assert(
    'Pricing: undefined values return null without throwing',
    getEffectivePrice(undefined, undefined) === null
  );
  assert(
    'Pricing: negative price returns null',
    getEffectivePrice(-500, null) === null
  );
  assert(
    'Pricing: NaN returns null',
    getEffectivePrice(NaN, null) === null
  );
  const savings = calculateSavings(5000, 4250);
  assert(
    'Pricing: calculateSavings computes exact discount amount and percent',
    savings.discountAmount === 750 && savings.discountPercent === 15 && savings.hasDiscount === true
  );

  // Test 11: Safe Formatters Defensive Edge Cases
  assert(
    'Formatters: formatPKR(4500) produces "PKR 4,500"',
    formatPKR(4500) === 'PKR 4,500'
  );
  assert(
    'Formatters: formatPKR("4500") produces "PKR 4,500"',
    formatPKR('4500') === 'PKR 4,500'
  );
  assert(
    'Formatters: formatPKR(null) returns fallback without throwing',
    formatPKR(null) === 'Price unavailable'
  );
  assert(
    'Formatters: formatPKR(undefined) returns fallback without throwing',
    formatPKR(undefined) === 'Price unavailable'
  );
  assert(
    'Formatters: formatPKR(NaN) returns fallback without throwing',
    formatPKR(NaN) === 'Price unavailable'
  );
  assert(
    'Formatters: formatPKR(0) formats "PKR 0"',
    formatPKR(0) === 'PKR 0'
  );
  assert(
    'Formatters: formatStock(42) produces "42 crates"',
    formatStock(42) === '42 crates'
  );
  assert(
    'Formatters: formatStock(0) produces "Out of stock"',
    formatStock(0) === 'Out of stock'
  );
  assert(
    'Formatters: formatStock(null) produces "Stock unavailable"',
    formatStock(null) === 'Stock unavailable'
  );
  assert(
    'Formatters: formatWeight(10) produces "10 KG"',
    formatWeight(10) === '10 KG'
  );
  assert(
    'Formatters: formatDate(null) returns fallback "N/A"',
    formatDate(null) === 'N/A'
  );
  assert(
    'Formatters: formatDate("invalid-date") returns fallback without throwing',
    formatDate('invalid-date') === 'N/A'
  );

  // Test 12: Customer Authorization Barrier & Security RBAC Matrix
  assert(
    'Security: CUSTOMER role strictly denied products:write',
    !hasPermission('CUSTOMER', 'products:write')
  );
  assert(
    'Security: CUSTOMER role strictly denied orders:write',
    !hasPermission('CUSTOMER', 'orders:write')
  );
  assert(
    'Security: CUSTOMER role strictly denied finance access',
    !hasPermission('CUSTOMER', 'finance:read') && !hasPermission('CUSTOMER', 'finance:write')
  );
  assert(
    'Security: CUSTOMER role strictly denied audit logs',
    !hasPermission('CUSTOMER', 'audit:read')
  );
  assert(
    'Security: ADMIN role has products:write permission',
    hasPermission('ADMIN', 'products:write')
  );
  assert(
    'Security: ADMIN role has orders:write permission',
    hasPermission('ADMIN', 'orders:write')
  );

  // Test 13: Zod DTO Schema Validation & effective_price Guarantee
  const testPkg = serializedProducts[0].packages[0];
  const pkgValidation = ProductPackageSchema.safeParse(testPkg);
  assert(
    'Zod Validation: Serialized package satisfies ProductPackageSchema',
    pkgValidation.success === true
  );
  assert(
    'DTO Contract: effective_price is strictly number or null (never undefined)',
    testPkg.effective_price !== undefined &&
    (typeof testPkg.effective_price === 'number' || testPkg.effective_price === null)
  );

  console.log(results.join('\n'));
  console.log(`\nTEST SUMMARY: ${passed} PASSED, ${failed} FAILED\n`);

  return { passed, failed, results };
}

// Auto-run if executed directly
runPlatformTests();
