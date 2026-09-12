import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { getFinancialOverview, getCashFlowTrends } from '@/lib/services/finance.service';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'orders:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDatabase();
    const financial = getFinancialOverview();
    const cashFlow = getCashFlowTrends();

    // Recent orders with customer & items
    const recentOrders = db.prepare(`
      SELECT 
        o.id, o.order_number, o.status, o.total_amount, o.payment_method,
        o.payment_status, o.tracking_number, o.created_at,
        COALESCE(c.full_name, o.guest_name, 'Guest') as customer_name,
        COALESCE(c.city, 'Pakistan') as city
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      ORDER BY datetime(o.created_at) DESC
      LIMIT 10
    `).all();

    // Best-selling varieties
    const varietySales = db.prepare(`
      SELECT 
        v.name as variety_name,
        SUM(oi.quantity) as total_boxes,
        SUM(oi.subtotal) as total_revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN mango_varieties v ON v.id = p.variety_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status NOT IN ('CANCELLED', 'FAILED')
      GROUP BY v.id, v.name
      ORDER BY total_revenue DESC
    `).all();

    // Low stock alerts
    const lowStockAlerts = db.prepare(`
      SELECT 
        v.name as variety_name,
        ps.name as package_name,
        inv.available_stock,
        inv.low_stock_threshold
      FROM inventory inv
      JOIN package_sizes ps ON ps.id = inv.package_size_id
      JOIN products p ON p.id = ps.product_id
      JOIN mango_varieties v ON v.id = p.variety_id
      WHERE inv.available_stock <= inv.low_stock_threshold
    `).all();

    // Active preorders count
    const activePreorders = db.prepare(`
      SELECT COUNT(id) as count, COALESCE(SUM(reserved_count), 0) as reserved_boxes
      FROM preorder_campaigns
      WHERE status = 'ACTIVE'
    `).get() as any;

    return NextResponse.json({
      success: true,
      user: { name: user.name, role: user.role },
      financial,
      cashFlow,
      recentOrders,
      varietySales,
      lowStockAlerts,
      preorders: activePreorders
    });
  } catch (err: any) {
    console.error('Admin overview error:', err);
    return NextResponse.json({ error: 'Failed to fetch admin overview' }, { status: 500 });
  }
}
