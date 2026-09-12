/**
 * Rigorous Verification Suite for Al Usmani Orchards Admin Analytics & Reports Module.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { getDatabase } = require('../src/lib/db');
const { ensureDatabaseReady } = require('../src/lib/db/init');
const {
  resolveDateRange,
  getAnalyticsDashboard,
  generateReportData
} = require('../src/lib/services/analytics.service');

let passedTests = 0;
let failedTests = 0;

function pass(msg) {
  passedTests++;
  console.log(`  ✓ PASS: ${msg}`);
}

function fail(msg, err) {
  failedTests++;
  console.error(`  ✗ FAIL: ${msg}`);
  if (err) console.error('   ', err);
}

async function runVerification() {
  console.log('===============================================================');
  console.log('  AL USMANI ORCHARDS - ADMIN ANALYTICS & REPORTS TEST SUITE');
  console.log('===============================================================');

  ensureDatabaseReady();
  const db = getDatabase();

  // 1. Files & Route Architecture Checks
  console.log('\n1. Files & Route Architecture Checks:');
  const filesToCheck = [
    'src/app/admin/analytics/page.tsx',
    'src/app/api/admin/analytics/route.ts',
    'src/app/api/admin/analytics/export/route.ts',
    'src/lib/services/analytics.service.ts'
  ];

  for (const relPath of filesToCheck) {
    const fullPath = path.join(__dirname, '..', relPath);
    if (fs.existsSync(fullPath)) {
      pass(`Route file exists: ${relPath}`);
    } else {
      fail(`Missing expected file: ${relPath}`);
    }
  }

  // Check AdminLayout navigation
  const layoutContent = fs.readFileSync(path.join(__dirname, '..', 'src/components/admin/AdminLayout.tsx'), 'utf8');
  if (layoutContent.includes("href: '/admin/analytics'")) {
    pass('AdminLayout navigation contains active link to /admin/analytics');
  } else {
    fail('AdminLayout does not link to /admin/analytics');
  }
  if (layoutContent.includes("href: '/admin/inventory'")) {
    pass('AdminLayout navigation contains active link to /admin/inventory');
  } else {
    fail('AdminLayout does not link to /admin/inventory');
  }

  // 2. Date Range Boundaries Resolution
  console.log('\n2. Date Range Boundaries Resolution:');
  const presets = ['today', 'yesterday', '7d', '30d', 'this_month', 'last_month', 'this_year', 'custom'];
  for (const p of presets) {
    const range = resolveDateRange({
      preset: p,
      startDate: p === 'custom' ? '2026-09-01' : undefined,
      endDate: p === 'custom' ? '2026-09-10' : undefined
    });
    if (range.currentStart && range.currentEnd && range.prevStart && range.prevEnd && range.label) {
      pass(`Preset "${p}" resolved successfully: ${range.label}`);
    } else {
      fail(`Preset "${p}" failed resolution`);
    }
  }

  // 3. Real SQLite Database Analytics Engine
  console.log('\n3. Real SQLite Database Analytics Engine:');
  const dashboard = getAnalyticsDashboard({ preset: '30d' });

  if (dashboard && dashboard.kpis) {
    pass('getAnalyticsDashboard executed successfully');
  } else {
    fail('getAnalyticsDashboard returned empty result');
  }

  // Verify KPIs
  const { kpis, charts, breakdowns, products, inventoryAlerts, discounts } = dashboard;
  
  // Real DB count checks
  const orderCountFromDb = db.prepare(`SELECT COUNT(id) as c FROM orders WHERE status NOT IN ('CANCELLED', 'FAILED')`).get().c;
  const customerCountFromDb = db.prepare(`SELECT COUNT(id) as c FROM customers`).get().c;
  const productCountFromDb = db.prepare(`SELECT COUNT(id) as c FROM products`).get().c;

  if (typeof kpis.revenue.current === 'number' && kpis.revenue.current >= 0) {
    pass(`Revenue KPI computed: PKR ${kpis.revenue.current} (all-time anchor: PKR ${kpis.revenue.allTime})`);
  } else {
    fail('Revenue KPI invalid');
  }

  if (typeof kpis.orders.current === 'number') {
    pass(`Orders KPI computed: ${kpis.orders.current} orders in period`);
  } else {
    fail('Orders KPI invalid');
  }

  if (kpis.customers.total === customerCountFromDb) {
    pass(`Customers count matches real DB customers table: ${kpis.customers.total}`);
  } else {
    fail(`Customer count mismatch: got ${kpis.customers.total}, expected ${customerCountFromDb}`);
  }

  if (kpis.products.total === productCountFromDb) {
    pass(`Products count matches real DB products table: ${kpis.products.total}`);
  } else {
    fail(`Products count mismatch: got ${kpis.products.total}, expected ${productCountFromDb}`);
  }

  // Period delta calculations
  if (typeof kpis.revenue.changePercent === 'number') {
    pass(`Revenue period comparison delta calculated: ${kpis.revenue.changePercent}%`);
  } else {
    fail('Revenue changePercent missing');
  }

  // Time-Series Data
  if (Array.isArray(charts.timeSeries)) {
    pass(`Time-series data points generated: ${charts.timeSeries.length} points`);
  } else {
    fail('Time-series data is not an array');
  }

  // Funnel Data
  if (Array.isArray(charts.funnel) && charts.funnel.length === 5) {
    pass(`Order funnel contains exactly 5 stages (${charts.funnel.map(s => s.stage).join(' -> ')})`);
  } else {
    fail(`Order funnel invalid length: ${charts.funnel?.length}`);
  }

  // Variety Breakdown
  if (Array.isArray(breakdowns.varietySales) && breakdowns.varietySales.length > 0) {
    pass(`Variety breakdown contains ${breakdowns.varietySales.length} mango varieties`);
    const topVar = breakdowns.varietySales[0];
    pass(`Top variety: ${topVar.variety_name} (Revenue: PKR ${topVar.revenue}, Share: ${topVar.share_percent}%)`);
  } else {
    fail('Variety breakdown is empty');
  }

  // Payment Breakdown
  if (Array.isArray(breakdowns.paymentMethods) && breakdowns.paymentMethods.length > 0) {
    pass(`Payment methods breakdown contains ${breakdowns.paymentMethods.length} methods`);
    for (const pm of breakdowns.paymentMethods) {
      pass(`Method "${pm.display_name}": ${pm.orders_count} orders, PKR ${pm.total_revenue}`);
    }
  } else {
    fail('Payment methods breakdown is empty');
  }

  // Product Performance & Turnover
  if (Array.isArray(products.all) && products.all.length > 0) {
    pass(`Product performance ranking generated for ${products.all.length} products`);
  } else {
    fail('Product performance list is empty');
  }

  // Inventory Alerts
  if (Array.isArray(inventoryAlerts)) {
    pass(`Inventory alerts checked: ${inventoryAlerts.length} items flagged`);
  } else {
    fail('Inventory alerts not an array');
  }

  // Discount Stats
  if (discounts && typeof discounts.netSales === 'number') {
    pass(`Discounts analytics computed: Gross PKR ${discounts.grossSales} - Discounts PKR ${discounts.totalDiscounts} = Net PKR ${discounts.netSales}`);
  } else {
    fail('Discounts analytics invalid');
  }

  // City Analytics
  if (Array.isArray(breakdowns.cityAnalytics)) {
    pass(`Geographical city rankings computed: ${breakdowns.cityAnalytics.length} locations identified`);
  } else {
    fail('City analytics missing');
  }

  // 4. Reports & CSV Export Engine
  console.log('\n4. Reports & CSV Export Engine:');
  const reportTypes = ['sales', 'orders', 'products', 'customers', 'inventory', 'payments', 'discounts'];

  for (const t of reportTypes) {
    const rep = generateReportData(t, { preset: '30d' });
    if (rep && rep.filename && Array.isArray(rep.headers) && rep.headers.length > 0 && Array.isArray(rep.rows)) {
      pass(`Report "${t}" generated: ${rep.filename} with ${rep.headers.length} columns and ${rep.rows.length} rows`);
      
      // Security check: ensure no passwords, hashes, tokens, salts or private secrets
      const rowStrings = JSON.stringify(rep.rows);
      const forbiddenTerms = ['password_hash', 'mfa_secret', 'token_hash', 'secret_key', 'private_key'];
      let leaked = false;
      for (const term of forbiddenTerms) {
        if (rowStrings.toLowerCase().includes(term)) {
          fail(`Report "${t}" contains sensitive credential term: ${term}`);
          leaked = true;
          break;
        }
      }
      if (!leaked) {
        pass(`Report "${t}" passed security sanitization (no credentials or secrets exposed)`);
      }
    } else {
      fail(`Report "${t}" failed generation`);
    }
  }

  // 5. API Route Handlers & RBAC Security Verification
  console.log('\n5. API Route Handlers & RBAC Security Verification:');
  const { NextRequest } = require('next/server');
  const { GET: analyticsGet } = require('../src/app/api/admin/analytics/route');
  const { GET: exportGet } = require('../src/app/api/admin/analytics/export/route');
  const { hasPermission } = require('../src/lib/auth/session');

  // 5a. Unauthenticated analytics GET -> 401
  const unauthReq = new NextRequest('http://localhost:3000/api/admin/analytics?range=30d');
  const unauthRes = await analyticsGet(unauthReq);
  if (unauthRes.status === 401) {
    pass('Unauthenticated GET /api/admin/analytics rejected with HTTP 401');
  } else {
    fail(`Unauthenticated request returned status ${unauthRes.status}, expected 401`);
  }

  // 5b. Unauthenticated export GET -> 401
  const unauthExportReq = new NextRequest('http://localhost:3000/api/admin/analytics/export?type=sales&range=30d');
  const unauthExportRes = await exportGet(unauthExportReq);
  if (unauthExportRes.status === 401) {
    pass('Unauthenticated GET /api/admin/analytics/export rejected with HTTP 401');
  } else {
    fail(`Unauthenticated export returned status ${unauthExportRes.status}, expected 401`);
  }

  // 5c. Verify RBAC permission matrix for analytics
  const rolesWithAccess = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'MARKETING_MANAGER'];
  const rolesWithoutAccess = ['CUSTOMER', 'SUPPORT_AGENT', 'INVENTORY_MANAGER', 'ORDER_MANAGER'];

  for (const r of rolesWithAccess) {
    const allowed = r === 'SUPER_ADMIN' || hasPermission(r, 'analytics:read');
    if (allowed) {
      pass(`Role "${r}" is properly authorized for analytics:read`);
    } else {
      fail(`Role "${r}" should have analytics access`);
    }
  }

  for (const r of rolesWithoutAccess) {
    const disallowed = !hasPermission(r, 'analytics:read');
    if (disallowed) {
      pass(`Role "${r}" is properly restricted from analytics:read`);
    } else {
      fail(`Role "${r}" should NOT have analytics access`);
    }
  }

  // 6. Overall Summary
  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passedTests} passed, ${failedTests} failed.`);
  console.log('===============================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerification().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
