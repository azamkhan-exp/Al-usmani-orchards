import { getDatabase } from '../db';

export interface FinancialOverview {
  grossSales: number;
  totalDiscounts: number;
  netSales: number;
  paidRevenue: number;
  pendingCodRevenue: number;
  totalRefunds: number;
  
  totalExpenses: number;
  expensesByCategory: Array<{ category: string; amount: number; percentage: number }>;
  
  grossProfit: number;
  netProfit: number;
  profitMarginPercent: number;

  totalOrdersCount: number;
  averageOrderValue: number;
  
  accountsReceivableTotal: number;
  accountsPayableTotal: number;
}

export function getFinancialOverview(): FinancialOverview {
  const db = getDatabase();

  // 1. Revenue Metrics
  const revenueQuery = db.prepare(`
    SELECT 
      COALESCE(SUM(subtotal), 0) as gross_sales,
      COALESCE(SUM(discount_amount), 0) as total_discounts,
      COALESCE(SUM(total_amount), 0) as net_sales,
      COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) as paid_revenue,
      COALESCE(SUM(CASE WHEN payment_status = 'PENDING' AND payment_method = 'COD' THEN total_amount ELSE 0 END), 0) as pending_cod,
      COUNT(id) as total_orders
    FROM orders
    WHERE status NOT IN ('CANCELLED', 'FAILED')
  `).get() as any;

  const refundQuery = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_refunds
    FROM refunds
    WHERE status = 'PROCESSED'
  `).get() as any;

  // 2. Expense Metrics
  const expenseSummary = db.prepare(`
    SELECT 
      c.name as category,
      COALESCE(SUM(e.amount), 0) as total_amount
    FROM expense_categories c
    LEFT JOIN expenses e ON e.category_id = c.id
    GROUP BY c.id, c.name
    ORDER BY total_amount DESC
  `).all() as Array<{ category: string; total_amount: number }>;

  const totalExpenses = expenseSummary.reduce((acc, row) => acc + row.total_amount, 0);

  const expensesByCategory = expenseSummary.map((item) => ({
    category: item.category,
    amount: item.total_amount,
    percentage: totalExpenses > 0 ? Math.round((item.total_amount / totalExpenses) * 100) : 0
  }));

  const grossSales = revenueQuery.gross_sales;
  const totalDiscounts = revenueQuery.total_discounts;
  const netSales = revenueQuery.net_sales;
  const paidRevenue = revenueQuery.paid_revenue;
  const pendingCodRevenue = revenueQuery.pending_cod;
  const totalRefunds = refundQuery.total_refunds;
  const totalOrdersCount = revenueQuery.total_orders;
  const averageOrderValue = totalOrdersCount > 0 ? Math.round(netSales / totalOrdersCount) : 0;

  // Direct Cost of Goods Sold (amortized fruit and direct harvest packing at ~35% of sales)
  const cogs = Math.round(netSales * 0.35);

  const grossProfit = netSales - cogs;
  const netProfit = Math.round(grossProfit - (totalExpenses * 0.15) - totalRefunds);
  const profitMarginPercent = netSales > 0 ? Math.round((netProfit / netSales) * 1000) / 10 : 0;

  // 3. Receivables & Payables
  const arQuery = db.prepare(`
    SELECT COALESCE(SUM(amount_due - amount_collected), 0) as pending_receivable
    FROM accounts_receivable
    WHERE status IN ('PENDING', 'PARTIALLY_PAID')
  `).get() as any;

  const apQuery = db.prepare(`
    SELECT COALESCE(SUM(amount_due - amount_paid), 0) as pending_payable
    FROM accounts_payable
    WHERE status IN ('PENDING', 'PARTIALLY_PAID')
  `).get() as any;

  return {
    grossSales,
    totalDiscounts,
    netSales,
    paidRevenue,
    pendingCodRevenue,
    totalRefunds,
    totalExpenses,
    expensesByCategory,
    grossProfit,
    netProfit,
    profitMarginPercent,
    totalOrdersCount,
    averageOrderValue,
    accountsReceivableTotal: arQuery.pending_receivable + pendingCodRevenue,
    accountsPayableTotal: apQuery.pending_payable
  };
}

export function getCashFlowTrends(): Array<{ month: string; inflow: number; outflow: number; net: number }> {
  const db = getDatabase();

  // Monthly inflow from payments
  const inflows = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total_inflow
    FROM payments
    WHERE status = 'PAID'
    GROUP BY month
    ORDER BY month ASC
  `).all() as Array<{ month: string; total_inflow: number }>;

  // Monthly outflow from expenses
  const outflows = db.prepare(`
    SELECT strftime('%Y-%m', expense_date) as month, SUM(amount) as total_outflow
    FROM expenses
    GROUP BY month
    ORDER BY month ASC
  `).all() as Array<{ month: string; total_outflow: number }>;

  const map = new Map<string, { month: string; inflow: number; outflow: number; net: number }>();

  for (const inf of inflows) {
    if (!inf.month) continue;
    map.set(inf.month, {
      month: inf.month,
      inflow: inf.total_inflow,
      outflow: 0,
      net: inf.total_inflow
    });
  }

  for (const out of outflows) {
    if (!out.month) continue;
    const existing = map.get(out.month) || { month: out.month, inflow: 0, outflow: 0, net: 0 };
    existing.outflow = out.total_outflow;
    existing.net = existing.inflow - existing.outflow;
    map.set(out.month, existing);
  }

  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}
