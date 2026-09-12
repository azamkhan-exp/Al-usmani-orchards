import { getDatabase } from '../db';
import { ensureDatabaseReady } from '../db/init';

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface DateRangeFilter {
  preset: DateRangePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  includeDemo?: boolean;
  includeArchived?: boolean;
  scope?: 'PRODUCTION' | 'DEMO' | 'ALL';
}

export interface ResolvedDateRange {
  currentStart: string; // YYYY-MM-DD HH:MM:SS
  currentEnd: string;   // YYYY-MM-DD HH:MM:SS
  prevStart: string;    // YYYY-MM-DD HH:MM:SS
  prevEnd: string;      // YYYY-MM-DD HH:MM:SS
  label: string;
}

/**
 * Resolves a date filter preset into exact SQLite UTC datetime boundaries for both
 * the current period and the previous equivalent comparison period.
 */
export function resolveDateRange(filter: DateRangeFilter): ResolvedDateRange {
  const now = new Date();

  // Helper to format Date to 'YYYY-MM-DD HH:MM:SS'
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  };

  const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  const endOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));

  let currentStart: Date;
  let currentEnd: Date = now;
  let prevStart: Date;
  let prevEnd: Date;
  let label = 'Last 30 Days';

  switch (filter.preset) {
    case 'today': {
      currentStart = startOfDay(now);
      currentEnd = endOfDay(now);
      prevStart = new Date(currentStart.getTime() - 86400000);
      prevEnd = new Date(currentEnd.getTime() - 86400000);
      label = 'Today';
      break;
    }
    case 'yesterday': {
      currentStart = new Date(startOfDay(now).getTime() - 86400000);
      currentEnd = new Date(endOfDay(now).getTime() - 86400000);
      prevStart = new Date(currentStart.getTime() - 86400000);
      prevEnd = new Date(currentEnd.getTime() - 86400000);
      label = 'Yesterday';
      break;
    }
    case '7d': {
      currentStart = new Date(now.getTime() - 7 * 86400000);
      const span = currentEnd.getTime() - currentStart.getTime();
      prevEnd = new Date(currentStart.getTime() - 1000);
      prevStart = new Date(prevEnd.getTime() - span);
      label = 'Last 7 Days';
      break;
    }
    case '30d': {
      currentStart = new Date(now.getTime() - 30 * 86400000);
      const span = currentEnd.getTime() - currentStart.getTime();
      prevEnd = new Date(currentStart.getTime() - 1000);
      prevStart = new Date(prevEnd.getTime() - span);
      label = 'Last 30 Days';
      break;
    }
    case 'this_month': {
      currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      currentEnd = endOfDay(now);
      const daysInCurrent = Math.max(1, Math.ceil((currentEnd.getTime() - currentStart.getTime()) / 86400000));
      prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
      prevEnd = new Date(prevStart.getTime() + daysInCurrent * 86400000);
      label = 'This Month';
      break;
    }
    case 'last_month': {
      currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
      // Last day of previous month
      currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
      const span = currentEnd.getTime() - currentStart.getTime();
      prevEnd = new Date(currentStart.getTime() - 1000);
      prevStart = new Date(prevEnd.getTime() - span);
      label = 'Last Month';
      break;
    }
    case 'this_year': {
      currentStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));
      currentEnd = endOfDay(now);
      const span = currentEnd.getTime() - currentStart.getTime();
      prevStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1, 0, 0, 0));
      prevEnd = new Date(prevStart.getTime() + span);
      label = 'This Year';
      break;
    }
    case 'custom': {
      if (filter.startDate) {
        const s = new Date(filter.startDate + 'T00:00:00Z');
        currentStart = isNaN(s.getTime()) ? new Date(now.getTime() - 30 * 86400000) : s;
      } else {
        currentStart = new Date(now.getTime() - 30 * 86400000);
      }

      if (filter.endDate) {
        const e = new Date(filter.endDate + 'T23:59:59Z');
        currentEnd = isNaN(e.getTime()) ? now : e;
      } else {
        currentEnd = now;
      }

      const span = Math.max(86400000, currentEnd.getTime() - currentStart.getTime());
      prevEnd = new Date(currentStart.getTime() - 1000);
      prevStart = new Date(prevEnd.getTime() - span);
      label = `${currentStart.toISOString().slice(0, 10)} to ${currentEnd.toISOString().slice(0, 10)}`;
      break;
    }
    default: {
      currentStart = new Date(now.getTime() - 30 * 86400000);
      prevEnd = new Date(currentStart.getTime() - 1000);
      prevStart = new Date(prevEnd.getTime() - 30 * 86400000);
      label = 'Last 30 Days';
    }
  }

  return {
    currentStart: fmt(currentStart),
    currentEnd: fmt(currentEnd),
    prevStart: fmt(prevStart),
    prevEnd: fmt(prevEnd),
    label
  };
}

/**
 * Calculates percentage change between two values with safe division.
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Returns comprehensive analytics data for the admin dashboard.
 */
export function getAnalyticsDashboard(filter: DateRangeFilter) {
  ensureDatabaseReady();
  const db = getDatabase();
  const range = resolveDateRange(filter);

  let orderFilter = '(is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL)';
  let orderFilterAlias = '(o.is_demo = 0 OR o.is_demo IS NULL) AND (o.is_archived = 0 OR o.is_archived IS NULL)';
  let custFilter = '(is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL)';

  if (filter.scope === 'DEMO') {
    orderFilter = 'is_demo = 1';
    orderFilterAlias = 'o.is_demo = 1';
    custFilter = 'is_demo = 1';
  } else if (filter.scope === 'ALL') {
    orderFilter = '1=1';
    orderFilterAlias = '1=1';
    custFilter = '1=1';
  } else if (filter.scope === 'PRODUCTION') {
    orderFilter = '(is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL)';
    orderFilterAlias = '(o.is_demo = 0 OR o.is_demo IS NULL) AND (o.is_archived = 0 OR o.is_archived IS NULL)';
    custFilter = '(is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL)';
  } else {
    // Fallback to legacy includeDemo / includeArchived flags
    orderFilter = filter.includeDemo
      ? (filter.includeArchived ? '1=1' : '(is_archived = 0 OR is_archived IS NULL)')
      : (filter.includeArchived
          ? '(is_demo = 0 OR is_demo IS NULL)'
          : '(is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL)');

    orderFilterAlias = filter.includeDemo
      ? (filter.includeArchived ? '1=1' : '(o.is_archived = 0 OR o.is_archived IS NULL)')
      : (filter.includeArchived
          ? '(o.is_demo = 0 OR o.is_demo IS NULL)'
          : '(o.is_demo = 0 OR o.is_demo IS NULL) AND (o.is_archived = 0 OR o.is_archived IS NULL)');

    custFilter = filter.includeDemo
      ? (filter.includeArchived ? '1=1' : '(is_archived = 0 OR is_archived IS NULL)')
      : (filter.includeArchived
          ? '(is_demo = 0 OR is_demo IS NULL)'
          : '(is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL)');
  }

  // 1. REVENUE KPIS (Current vs Previous)
  const currentRevRow = db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(subtotal), 0) as gross_revenue,
      COALESCE(SUM(discount_amount), 0) as total_discounts,
      COALESCE(SUM(shipping_fee), 0) as total_shipping,
      COUNT(id) as total_orders
    FROM orders
    WHERE created_at >= ? AND created_at <= ?
      AND status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilter}
  `).get(range.currentStart, range.currentEnd) as any;

  const prevRevRow = db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COUNT(id) as total_orders
    FROM orders
    WHERE created_at >= ? AND created_at <= ?
      AND status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilter}
  `).get(range.prevStart, range.prevEnd) as any;

  const currentRevenue = currentRevRow.total_revenue;
  const prevRevenue = prevRevRow.total_revenue;
  const revenueChangePercent = calculateChange(currentRevenue, prevRevenue);

  // Lifetime & Period Anchors
  const periodAnchors = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN date(created_at) = date('now') THEN total_amount ELSE 0 END), 0) as rev_today,
      COALESCE(SUM(CASE WHEN strftime('%W', created_at) = strftime('%W', 'now') AND strftime('%Y', created_at) = strftime('%Y', 'now') THEN total_amount ELSE 0 END), 0) as rev_this_week,
      COALESCE(SUM(CASE WHEN strftime('%m', created_at) = strftime('%m', 'now') AND strftime('%Y', created_at) = strftime('%Y', 'now') THEN total_amount ELSE 0 END), 0) as rev_this_month,
      COALESCE(SUM(CASE WHEN strftime('%Y', created_at) = strftime('%Y', 'now') THEN total_amount ELSE 0 END), 0) as rev_this_year,
      COALESCE(SUM(total_amount), 0) as rev_all_time,
      COUNT(CASE WHEN date(created_at) = date('now') THEN 1 END) as orders_today,
      COUNT(CASE WHEN strftime('%W', created_at) = strftime('%W', 'now') AND strftime('%Y', created_at) = strftime('%Y', 'now') THEN 1 END) as orders_this_week,
      COUNT(CASE WHEN strftime('%m', created_at) = strftime('%m', 'now') AND strftime('%Y', created_at) = strftime('%Y', 'now') THEN 1 END) as orders_this_month,
      COUNT(id) as orders_all_time
    FROM orders
    WHERE status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilter}
  `).get() as any;

  // 2. ORDER KPIS & STATUS BREAKDOWN
  const currentOrders = currentRevRow.total_orders;
  const prevOrders = prevRevRow.total_orders;
  const ordersChangePercent = calculateChange(currentOrders, prevOrders);

  const orderStatusCounts = db.prepare(`
    SELECT 
      status,
      COUNT(id) as count,
      COALESCE(SUM(total_amount), 0) as amount
    FROM orders
    WHERE created_at >= ? AND created_at <= ?
      AND ${orderFilter}
    GROUP BY status
  `).all(range.currentStart, range.currentEnd) as Array<{ status: string; count: number; amount: number }>;

  const pendingOrders = orderStatusCounts
    .filter(s => ['PENDING', 'PAYMENT_PENDING'].includes(s.status))
    .reduce((sum, s) => sum + s.count, 0);

  const completedOrders = orderStatusCounts
    .filter(s => s.status === 'DELIVERED')
    .reduce((sum, s) => sum + s.count, 0);

  const cancelledOrders = orderStatusCounts
    .filter(s => ['CANCELLED', 'FAILED'].includes(s.status))
    .reduce((sum, s) => sum + s.count, 0);

  const inTransitOrders = orderStatusCounts
    .filter(s => ['CONFIRMED', 'PROCESSING', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(s.status))
    .reduce((sum, s) => sum + s.count, 0);

  // Average Order Value
  const currentAov = currentOrders > 0 ? Math.round(currentRevenue / currentOrders) : 0;
  const prevAov = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;
  const aovChangePercent = calculateChange(currentAov, prevAov);

  // 3. CUSTOMER KPIS (Real Customers Table)
  const totalCustomers = (db.prepare(`SELECT COUNT(id) as c FROM customers WHERE ${custFilter}`).get() as any).c;

  const currentNewCust = (db.prepare(`
    SELECT COUNT(id) as c FROM customers
    WHERE created_at >= ? AND created_at <= ?
      AND ${custFilter}
  `).get(range.currentStart, range.currentEnd) as any).c;

  const prevNewCust = (db.prepare(`
    SELECT COUNT(id) as c FROM customers
    WHERE created_at >= ? AND created_at <= ?
      AND ${custFilter}
  `).get(range.prevStart, range.prevEnd) as any).c;

  const newCustomersChangePercent = calculateChange(currentNewCust, prevNewCust);

  // Returning Customers: customers who placed an order in this period and have orders_count > 1
  const returningCustCount = (db.prepare(`
    SELECT COUNT(DISTINCT customer_id) as c
    FROM orders
    WHERE customer_id IS NOT NULL
      AND created_at >= ? AND created_at <= ?
      AND ${orderFilter}
      AND customer_id IN (SELECT id FROM customers WHERE orders_count > 1 AND ${custFilter})
  `).get(range.currentStart, range.currentEnd) as any).c;

  const customerGrowthRate = totalCustomers > 0 ? Math.round((currentNewCust / totalCustomers) * 1000) / 10 : 0;

  // 4. PRODUCT & INVENTORY KPIS
  const productCounts = db.prepare(`
    SELECT 
      COUNT(id) as total_products,
      COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_products
    FROM products
  `).get() as any;

  const inventorySummary = db.prepare(`
    SELECT 
      COUNT(id) as total_variants,
      COALESCE(SUM(total_stock), 0) as total_units,
      COALESCE(SUM(available_stock), 0) as available_units,
      COALESCE(SUM(reserved_stock), 0) as reserved_units,
      COUNT(CASE WHEN available_stock = 0 THEN 1 END) as out_of_stock_count,
      COUNT(CASE WHEN available_stock > 0 AND available_stock <= low_stock_threshold THEN 1 END) as low_stock_count
    FROM inventory
  `).get() as any;

  // 5. TIME-SERIES CHART DATA (Daily or monthly grouping)
  const startDateObj = new Date(range.currentStart);
  const endDateObj = new Date(range.currentEnd);
  const diffDays = Math.max(1, Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / 86400000));

  let timeSeriesSql = '';
  if (diffDays <= 45) {
    // Group by Date (YYYY-MM-DD)
    timeSeriesSql = `
      SELECT 
        strftime('%Y-%m-%d', created_at) as date_key,
        strftime('%d %b', created_at) as display_label,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(id) as orders,
        ROUND(COALESCE(AVG(total_amount), 0)) as aov
      FROM orders
      WHERE created_at >= ? AND created_at <= ?
        AND status NOT IN ('CANCELLED', 'FAILED')
        AND ${orderFilter}
      GROUP BY date_key
      ORDER BY date_key ASC
    `;
  } else {
    // Group by Month (YYYY-MM)
    timeSeriesSql = `
      SELECT 
        strftime('%Y-%m', created_at) as date_key,
        strftime('%b %Y', created_at) as display_label,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(id) as orders,
        ROUND(COALESCE(AVG(total_amount), 0)) as aov
      FROM orders
      WHERE created_at >= ? AND created_at <= ?
        AND status NOT IN ('CANCELLED', 'FAILED')
        AND ${orderFilter}
      GROUP BY date_key
      ORDER BY date_key ASC
    `;
  }

  const rawTimeSeries = db.prepare(timeSeriesSql).all(range.currentStart, range.currentEnd) as Array<{
    date_key: string;
    display_label: string;
    revenue: number;
    orders: number;
    aov: number;
  }>;

  // 6. SALES BY MANGO VARIETY
  const varietySales = db.prepare(`
    SELECT 
      v.id as variety_id,
      v.name as variety_name,
      v.origin_city,
      v.image_url,
      COALESCE(SUM(oi.quantity), 0) as units_sold,
      COALESCE(SUM(oi.subtotal), 0) as revenue,
      COUNT(DISTINCT oi.order_id) as orders_count
    FROM mango_varieties v
    LEFT JOIN products p ON p.variety_id = v.id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id 
      AND o.created_at >= ? AND o.created_at <= ?
      AND o.status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilterAlias}
    GROUP BY v.id, v.name
    ORDER BY revenue DESC
  `).all(range.currentStart, range.currentEnd) as Array<{
    variety_id: string;
    variety_name: string;
    origin_city: string;
    image_url: string;
    units_sold: number;
    revenue: number;
    orders_count: number;
  }>;

  const totalVarietyRevenue = varietySales.reduce((acc, v) => acc + v.revenue, 0);
  const varietySalesWithShare = varietySales.map(v => ({
    ...v,
    share_percent: totalVarietyRevenue > 0 ? Math.round((v.revenue / totalVarietyRevenue) * 1000) / 10 : 0
  }));

  // 7. SALES BY PAYMENT METHOD (Authoritative methods from schema)
  const paymentMethodSales = db.prepare(`
    SELECT 
      o.payment_method,
      COUNT(o.id) as orders_count,
      COALESCE(SUM(o.total_amount), 0) as total_revenue,
      COUNT(CASE WHEN o.payment_status = 'PAID' THEN 1 END) as paid_count,
      COUNT(CASE WHEN o.payment_status IN ('PENDING', 'AWAITING_VERIFICATION') THEN 1 END) as pending_count,
      COUNT(CASE WHEN o.payment_status = 'FAILED' THEN 1 END) as failed_count
    FROM orders o
    WHERE o.created_at >= ? AND o.created_at <= ?
      AND o.status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilterAlias}
    GROUP BY o.payment_method
    ORDER BY total_revenue DESC
  `).all(range.currentStart, range.currentEnd) as Array<{
    payment_method: string;
    orders_count: number;
    total_revenue: number;
    paid_count: number;
    pending_count: number;
    failed_count: number;
  }>;

  // Normalize method display names
  const paymentMethodsFormatted = paymentMethodSales.map(pm => {
    let name = pm.payment_method;
    if (name === 'COD') name = 'Cash on Delivery (COD)';
    else if (name === 'EASYPAISA') name = 'EasyPaisa Wallet';
    else if (name === 'JAZZCASH') name = 'JazzCash Wallet';
    else if (name === 'CARD' || name === 'ONLINE_CARD') name = 'Credit / Debit Card';
    else if (name === 'BANK_TRANSFER') name = 'Direct Bank Transfer';
    return {
      ...pm,
      display_name: name,
      share_percent: currentRevenue > 0 ? Math.round((pm.total_revenue / currentRevenue) * 1000) / 10 : 0
    };
  });

  // 8. TOP SELLING PRODUCTS & LOW PERFORMING PRODUCTS
  const productPerformance = db.prepare(`
    SELECT 
      p.id,
      p.name,
      v.name as variety_name,
      p.primary_image,
      p.grade,
      COALESCE(SUM(oi.quantity), 0) as units_sold,
      COALESCE(SUM(oi.subtotal), 0) as revenue,
      COUNT(DISTINCT oi.order_id) as orders_count,
      COALESCE(inv.available_stock, 0) as current_stock,
      p.status
    FROM products p
    JOIN mango_varieties v ON v.id = p.variety_id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id 
      AND o.created_at >= ? AND o.created_at <= ?
      AND o.status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilterAlias}
    LEFT JOIN (
      SELECT ps.product_id, SUM(i.available_stock) as available_stock
      FROM inventory i
      JOIN package_sizes ps ON ps.id = i.package_size_id
      GROUP BY ps.product_id
    ) inv ON inv.product_id = p.id
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
  `).all(range.currentStart, range.currentEnd) as Array<{
    id: string;
    name: string;
    variety_name: string;
    primary_image: string;
    grade: string;
    units_sold: number;
    revenue: number;
    orders_count: number;
    current_stock: number;
    status: string;
  }>;

  const totalProductRevenue = productPerformance.reduce((acc, p) => acc + p.revenue, 0);
  const productsWithShare = productPerformance.map(p => ({
    ...p,
    share_percent: totalProductRevenue > 0 ? Math.round((p.revenue / totalProductRevenue) * 1000) / 10 : 0
  }));

  const bestSellers = [...productsWithShare].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const lowPerformers = [...productsWithShare]
    .filter(p => p.status === 'ACTIVE')
    .sort((a, b) => a.units_sold - b.units_sold);

  // 9. INVENTORY ALERTS (Low stock & Out of stock items)
  const inventoryAlerts = db.prepare(`
    SELECT 
      inv.id as inventory_id,
      p.name as product_name,
      v.name as variety_name,
      ps.name as package_name,
      ps.sku,
      inv.available_stock,
      inv.reserved_stock,
      inv.low_stock_threshold,
      CASE 
        WHEN inv.available_stock = 0 THEN 'OUT_OF_STOCK'
        WHEN inv.available_stock <= inv.low_stock_threshold THEN 'LOW_STOCK'
        ELSE 'HEALTHY'
      END as stock_status
    FROM inventory inv
    JOIN package_sizes ps ON ps.id = inv.package_size_id
    JOIN products p ON p.id = ps.product_id
    JOIN mango_varieties v ON v.id = p.variety_id
    WHERE inv.available_stock <= inv.low_stock_threshold
    ORDER BY inv.available_stock ASC
  `).all() as Array<{
    inventory_id: string;
    product_name: string;
    variety_name: string;
    package_name: string;
    sku: string;
    available_stock: number;
    reserved_stock: number;
    low_stock_threshold: number;
    stock_status: string;
  }>;

  // 10. ORDER CONVERSION FUNNEL
  const totalOrdersCreated = (db.prepare(`
    SELECT COUNT(id) as c FROM orders 
    WHERE created_at >= ? AND created_at <= ?
      AND ${orderFilter}
  `).get(range.currentStart, range.currentEnd) as any).c;

  const funnelStages = [
    { stage: 'Orders Created', count: totalOrdersCreated, color: '#113824' },
    {
      stage: 'Confirmed',
      count: orderStatusCounts.filter(s => !['CANCELLED', 'FAILED', 'PENDING', 'PAYMENT_PENDING'].includes(s.status)).reduce((acc, s) => acc + s.count, 0),
      color: '#195235'
    },
    {
      stage: 'Processing / Packing',
      count: orderStatusCounts.filter(s => ['PROCESSING', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s.status)).reduce((acc, s) => acc + s.count, 0),
      color: '#D97706'
    },
    {
      stage: 'Dispatched & Transit',
      count: orderStatusCounts.filter(s => ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(s.status)).reduce((acc, s) => acc + s.count, 0),
      color: '#F59E0B'
    },
    {
      stage: 'Delivered',
      count: completedOrders,
      color: '#059669'
    }
  ].map((item, idx, arr) => ({
    ...item,
    conversion_from_start: totalOrdersCreated > 0 ? Math.round((item.count / totalOrdersCreated) * 100) : 0,
    dropoff_rate: idx > 0 && arr[idx - 1].count > 0 ? Math.round(((arr[idx - 1].count - item.count) / arr[idx - 1].count) * 100) : 0
  }));

  const leakageMetrics = {
    cancelled: cancelledOrders,
    failed: orderStatusCounts.filter(s => s.status === 'FAILED').reduce((acc, s) => acc + s.count, 0),
    refunded: (db.prepare(`SELECT COUNT(id) as c FROM refunds WHERE status = 'PROCESSED' AND created_at >= ? AND created_at <= ?`).get(range.currentStart, range.currentEnd) as any)?.c || 0
  };

  // 11. DISCOUNT & OFFER ANALYTICS
  const discountStats = db.prepare(`
    SELECT 
      COALESCE(SUM(discount_amount), 0) as total_discounts_given,
      COUNT(CASE WHEN discount_amount > 0 THEN 1 END) as orders_with_discount,
      COALESCE(SUM(CASE WHEN discount_amount > 0 THEN total_amount ELSE 0 END), 0) as discounted_orders_revenue
    FROM orders
    WHERE created_at >= ? AND created_at <= ?
      AND status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilter}
  `).get(range.currentStart, range.currentEnd) as any;

  const topCouponsUsed = db.prepare(`
    SELECT 
      coupon_code,
      COUNT(id) as times_used,
      COALESCE(SUM(discount_amount), 0) as total_discount_amount,
      COALESCE(SUM(total_amount), 0) as order_revenue
    FROM orders
    WHERE created_at >= ? AND created_at <= ?
      AND coupon_code IS NOT NULL AND coupon_code != ''
      AND status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilter}
    GROUP BY coupon_code
    ORDER BY times_used DESC
    LIMIT 5
  `).all(range.currentStart, range.currentEnd) as Array<{
    coupon_code: string;
    times_used: number;
    total_discount_amount: number;
    order_revenue: number;
  }>;

  // 12. GEOGRAPHICAL ANALYTICS (Orders by City, Province, District)
  const cityAnalytics = db.prepare(`
    SELECT 
      COALESCE(
        NULLIF(TRIM(json_extract(o.shipping_address_json, '$.city')), ''),
        NULLIF(TRIM(c.city), ''),
        'Other / Unspecified'
      ) as city,
      COUNT(o.id) as orders_count,
      COALESCE(SUM(o.total_amount), 0) as total_revenue
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE o.created_at >= ? AND o.created_at <= ?
      AND o.status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilterAlias}
    GROUP BY city
    ORDER BY total_revenue DESC
    LIMIT 10
  `).all(range.currentStart, range.currentEnd) as Array<{
    city: string;
    orders_count: number;
    total_revenue: number;
  }>;

  const totalCityRevenue = cityAnalytics.reduce((acc, c) => acc + c.total_revenue, 0);
  const cityAnalyticsWithShare = cityAnalytics.map(c => ({
    ...c,
    share_percent: totalCityRevenue > 0 ? Math.round((c.total_revenue / totalCityRevenue) * 1000) / 10 : 0
  }));

  // Province Breakdown
  const provinceAnalytics = db.prepare(`
    SELECT 
      COALESCE(
        NULLIF(TRIM(json_extract(o.shipping_address_json, '$.province')), ''),
        'Punjab'
      ) as province,
      COUNT(o.id) as orders_count,
      COALESCE(SUM(o.total_amount), 0) as total_revenue
    FROM orders o
    WHERE o.created_at >= ? AND o.created_at <= ?
      AND o.status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilterAlias}
    GROUP BY province
    ORDER BY total_revenue DESC
  `).all(range.currentStart, range.currentEnd) as Array<{
    province: string;
    orders_count: number;
    total_revenue: number;
  }>;

  const totalProvRevenue = provinceAnalytics.reduce((acc, p) => acc + p.total_revenue, 0);
  const provinceAnalyticsWithShare = provinceAnalytics.map(p => ({
    ...p,
    share_percent: totalProvRevenue > 0 ? Math.round((p.total_revenue / totalProvRevenue) * 1000) / 10 : 0
  }));

  // District Breakdown
  const districtAnalytics = db.prepare(`
    SELECT 
      COALESCE(
        NULLIF(TRIM(json_extract(o.shipping_address_json, '$.district')), ''),
        NULLIF(TRIM(json_extract(o.shipping_address_json, '$.city')), ''),
        'Unspecified District'
      ) as district,
      COALESCE(
        NULLIF(TRIM(json_extract(o.shipping_address_json, '$.province')), ''),
        'Punjab'
      ) as province,
      COUNT(o.id) as orders_count,
      COALESCE(SUM(o.total_amount), 0) as total_revenue
    FROM orders o
    WHERE o.created_at >= ? AND o.created_at <= ?
      AND o.status NOT IN ('CANCELLED', 'FAILED')
      AND ${orderFilterAlias}
    GROUP BY district, province
    ORDER BY total_revenue DESC
    LIMIT 10
  `).all(range.currentStart, range.currentEnd) as Array<{
    district: string;
    province: string;
    orders_count: number;
    total_revenue: number;
  }>;

  return {
    dateRange: range,
    kpis: {
      revenue: {
        current: currentRevenue,
        previous: prevRevenue,
        changePercent: revenueChangePercent,
        gross: currentRevRow.gross_revenue,
        discounts: currentRevRow.total_discounts,
        shipping: currentRevRow.total_shipping,
        today: periodAnchors.rev_today,
        thisWeek: periodAnchors.rev_this_week,
        thisMonth: periodAnchors.rev_this_month,
        thisYear: periodAnchors.rev_this_year,
        allTime: periodAnchors.rev_all_time
      },
      orders: {
        current: currentOrders,
        previous: prevOrders,
        changePercent: ordersChangePercent,
        today: periodAnchors.orders_today,
        thisWeek: periodAnchors.orders_this_week,
        thisMonth: periodAnchors.orders_this_month,
        allTime: periodAnchors.orders_all_time,
        pending: pendingOrders,
        inTransit: inTransitOrders,
        completed: completedOrders,
        cancelled: cancelledOrders
      },
      aov: {
        current: currentAov,
        previous: prevAov,
        changePercent: aovChangePercent
      },
      customers: {
        total: totalCustomers,
        new: currentNewCust,
        previousNew: prevNewCust,
        changePercent: newCustomersChangePercent,
        returning: returningCustCount,
        growthRate: customerGrowthRate
      },
      products: {
        total: productCounts.total_products,
        active: productCounts.active_products,
        outOfStock: inventorySummary.out_of_stock_count,
        lowStock: inventorySummary.low_stock_count,
        totalStockUnits: inventorySummary.available_units
      }
    },
    charts: {
      timeSeries: rawTimeSeries,
      funnel: funnelStages,
      leakage: leakageMetrics
    },
    breakdowns: {
      varietySales: varietySalesWithShare,
      paymentMethods: paymentMethodsFormatted,
      cityAnalytics: cityAnalyticsWithShare,
      provinceAnalytics: provinceAnalyticsWithShare,
      districtAnalytics: districtAnalytics
    },
    products: {
      bestSellers,
      lowPerformers,
      all: productsWithShare
    },
    inventoryAlerts,
    discounts: {
      grossSales: currentRevRow.gross_revenue,
      totalDiscounts: discountStats.total_discounts_given,
      netSales: currentRevenue,
      discountedOrdersCount: discountStats.orders_with_discount,
      discountedOrdersRevenue: discountStats.discounted_orders_revenue,
      topCoupons: topCouponsUsed
    }
  };
}

/**
 * Generates sanitized tabular rows and column definitions for CSV reports.
 */
export function generateReportData(
  reportType: 'sales' | 'orders' | 'products' | 'customers' | 'inventory' | 'payments' | 'discounts',
  filter: DateRangeFilter
) {
  ensureDatabaseReady();
  const db = getDatabase();
  const range = resolveDateRange(filter);

  const orderFilter = filter.includeDemo
    ? (filter.includeArchived ? '1=1' : '(is_archived = 0 OR is_archived IS NULL)')
    : (filter.includeArchived
        ? '(is_demo = 0 OR is_demo IS NULL)'
        : '(is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL)');

  const orderFilterAlias = filter.includeDemo
    ? (filter.includeArchived ? '1=1' : '(o.is_archived = 0 OR o.is_archived IS NULL)')
    : (filter.includeArchived
        ? '(o.is_demo = 0 OR o.is_demo IS NULL)'
        : '(o.is_demo = 0 OR o.is_demo IS NULL) AND (o.is_archived = 0 OR o.is_archived IS NULL)');

  const custFilter = filter.includeDemo
    ? (filter.includeArchived ? '1=1' : '(is_archived = 0 OR is_archived IS NULL)')
    : (filter.includeArchived
        ? '(is_demo = 0 OR is_demo IS NULL)'
        : '(is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL)');

  const custFilterAlias = filter.includeDemo
    ? (filter.includeArchived ? '1=1' : '(c.is_archived = 0 OR c.is_archived IS NULL)')
    : (filter.includeArchived
        ? '(c.is_demo = 0 OR c.is_demo IS NULL)'
        : '(c.is_demo = 0 OR c.is_demo IS NULL) AND (c.is_archived = 0 OR c.is_archived IS NULL)');

  switch (reportType) {
    case 'sales': {
      const rows = db.prepare(`
        SELECT 
          o.created_at,
          o.order_number,
          COALESCE(c.full_name, o.guest_name, 'Guest') as customer_name,
          COALESCE(NULLIF(TRIM(json_extract(o.shipping_address_json, '$.city')), ''), c.city, 'Pakistan') as city,
          o.subtotal,
          o.discount_amount,
          o.shipping_fee,
          o.total_amount,
          o.payment_method,
          o.payment_status,
          o.status as order_status
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        WHERE o.created_at >= ? AND o.created_at <= ?
          AND ${orderFilterAlias}
        ORDER BY o.created_at DESC
      `).all(range.currentStart, range.currentEnd);

      return {
        filename: `al-usmani-sales-report-${filter.preset}.csv`,
        headers: ['Date', 'Order Number', 'Customer', 'City', 'Subtotal (PKR)', 'Discount (PKR)', 'Shipping (PKR)', 'Total Amount (PKR)', 'Payment Method', 'Payment Status', 'Order Status'],
        rows: rows.map((r: any) => [
          r.created_at,
          r.order_number,
          r.customer_name,
          r.city,
          r.subtotal,
          r.discount_amount,
          r.shipping_fee,
          r.total_amount,
          r.payment_method,
          r.payment_status,
          r.order_status
        ])
      };
    }

    case 'orders': {
      const rows = db.prepare(`
        SELECT 
          o.order_number,
          o.created_at,
          COALESCE(c.full_name, o.guest_name, 'Guest') as customer_name,
          COALESCE(c.email, o.guest_email, 'N/A') as customer_email,
          COALESCE(c.phone, o.guest_phone, 'N/A') as customer_phone,
          o.total_amount,
          o.payment_method,
          o.payment_status,
          o.status,
          COALESCE(cour.name, 'Unassigned') as courier_name,
          COALESCE(o.tracking_number, 'Pending') as tracking_number
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN couriers cour ON cour.id = o.courier_id
        WHERE o.created_at >= ? AND o.created_at <= ?
          AND ${orderFilterAlias}
        ORDER BY o.created_at DESC
      `).all(range.currentStart, range.currentEnd);

      return {
        filename: `al-usmani-orders-report-${filter.preset}.csv`,
        headers: ['Order Number', 'Date', 'Customer Name', 'Email', 'Phone', 'Total Amount (PKR)', 'Payment Method', 'Payment Status', 'Fulfillment Status', 'Courier', 'Tracking Number'],
        rows: rows.map((r: any) => [
          r.order_number,
          r.created_at,
          r.customer_name,
          r.customer_email,
          r.customer_phone,
          r.total_amount,
          r.payment_method,
          r.payment_status,
          r.status,
          r.courier_name,
          r.tracking_number
        ])
      };
    }

    case 'products': {
      const rows = db.prepare(`
        SELECT 
          p.name as product_name,
          v.name as variety_name,
          p.grade,
          p.status,
          COALESCE(SUM(oi.quantity), 0) as units_sold,
          COUNT(DISTINCT oi.order_id) as orders_count,
          COALESCE(SUM(oi.subtotal), 0) as revenue,
          COALESCE(inv.available_stock, 0) as current_stock
        FROM products p
        JOIN mango_varieties v ON v.id = p.variety_id
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN orders o ON o.id = oi.order_id 
          AND o.created_at >= ? AND o.created_at <= ?
          AND o.status NOT IN ('CANCELLED', 'FAILED')
        LEFT JOIN (
          SELECT ps.product_id, SUM(i.available_stock) as available_stock
          FROM inventory i
          JOIN package_sizes ps ON ps.id = i.package_size_id
          GROUP BY ps.product_id
        ) inv ON inv.product_id = p.id
        GROUP BY p.id, p.name
        ORDER BY revenue DESC
      `).all(range.currentStart, range.currentEnd);

      return {
        filename: `al-usmani-products-performance-${filter.preset}.csv`,
        headers: ['Product Name', 'Mango Variety', 'Grade', 'Status', 'Units Sold', 'Orders Count', 'Revenue (PKR)', 'Available Stock'],
        rows: rows.map((r: any) => [
          r.product_name,
          r.variety_name,
          r.grade,
          r.status,
          r.units_sold,
          r.orders_count,
          r.revenue,
          r.current_stock
        ])
      };
    }

    case 'customers': {
      const rows = db.prepare(`
        SELECT 
          c.full_name,
          c.email,
          COALESCE(c.phone, 'N/A') as phone,
          COALESCE(c.city, 'Pakistan') as city,
          c.segment,
          c.orders_count,
          c.total_spent,
          c.created_at
        FROM customers c
        WHERE ${custFilterAlias}
        ORDER BY c.total_spent DESC
      `).all();

      return {
        filename: `al-usmani-customer-directory.csv`,
        headers: ['Customer Name', 'Email', 'Phone', 'City', 'Segment', 'Total Orders', 'Total Spent (PKR)', 'Joined Date'],
        rows: rows.map((r: any) => [
          r.full_name,
          r.email,
          r.phone,
          r.city,
          r.segment,
          r.orders_count,
          r.total_spent,
          r.created_at
        ])
      };
    }

    case 'inventory': {
      const rows = db.prepare(`
        SELECT 
          p.name as product_name,
          v.name as variety_name,
          ps.name as package_name,
          ps.sku,
          inv.available_stock,
          inv.reserved_stock,
          inv.total_stock,
          inv.low_stock_threshold,
          CASE 
            WHEN inv.available_stock = 0 THEN 'OUT_OF_STOCK'
            WHEN inv.available_stock <= inv.low_stock_threshold THEN 'LOW_STOCK'
            ELSE 'HEALTHY'
          END as stock_health
        FROM inventory inv
        JOIN package_sizes ps ON ps.id = inv.package_size_id
        JOIN products p ON p.id = ps.product_id
        JOIN mango_varieties v ON v.id = p.variety_id
        ORDER BY inv.available_stock ASC
      `).all();

      return {
        filename: `al-usmani-inventory-audit.csv`,
        headers: ['Product', 'Variety', 'Package Size', 'SKU', 'Available Crates', 'Reserved Crates', 'Total Stock', 'Low Stock Threshold', 'Health Status'],
        rows: rows.map((r: any) => [
          r.product_name,
          r.variety_name,
          r.package_name,
          r.sku,
          r.available_stock,
          r.reserved_stock,
          r.total_stock,
          r.low_stock_threshold,
          r.stock_health
        ])
      };
    }

    case 'payments': {
      const rows = db.prepare(`
        SELECT 
          o.order_number,
          o.created_at,
          o.payment_method,
          o.total_amount,
          o.payment_status,
          COALESCE(pt.transaction_reference, o.tracking_number, 'N/A') as reference
        FROM orders o
        LEFT JOIN payment_transactions pt ON pt.order_id = o.id
        WHERE o.created_at >= ? AND o.created_at <= ?
          AND ${orderFilterAlias}
        ORDER BY o.created_at DESC
      `).all(range.currentStart, range.currentEnd);

      return {
        filename: `al-usmani-payment-reconciliation-${filter.preset}.csv`,
        headers: ['Order Number', 'Date', 'Payment Method', 'Amount (PKR)', 'Status', 'Transaction Reference'],
        rows: rows.map((r: any) => [
          r.order_number,
          r.created_at,
          r.payment_method,
          r.total_amount,
          r.payment_status,
          r.reference
        ])
      };
    }

    case 'discounts': {
      const rows = db.prepare(`
        SELECT 
          p.code,
          p.name,
          p.discount_type,
          p.discount_value,
          p.times_used,
          COALESCE(SUM(o.discount_amount), 0) as total_discounts_given,
          COALESCE(SUM(o.total_amount), 0) as generated_revenue
        FROM promotions p
        LEFT JOIN orders o ON o.coupon_code = p.code 
          AND o.created_at >= ? AND o.created_at <= ?
          AND o.status NOT IN ('CANCELLED', 'FAILED')
          AND ${orderFilterAlias}
        GROUP BY p.id, p.code
        ORDER BY total_discounts_given DESC
      `).all(range.currentStart, range.currentEnd);

      return {
        filename: `al-usmani-discounts-audit-${filter.preset}.csv`,
        headers: ['Coupon Code', 'Promotion Name', 'Discount Type', 'Value', 'Lifetime Uses', 'Discounts Given in Period (PKR)', 'Revenue Generated in Period (PKR)'],
        rows: rows.map((r: any) => [
          r.code,
          r.name,
          r.discount_type,
          r.discount_value,
          r.times_used,
          r.total_discounts_given,
          r.generated_revenue
        ])
      };
    }
  }
}
