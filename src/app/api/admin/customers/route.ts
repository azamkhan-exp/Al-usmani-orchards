import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'customers:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDatabase();
    const customers = await db.prepare(`
      SELECT 
        c.*,
        v.name as preferred_variety_name,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) as real_orders_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE o.customer_id = c.id AND o.status NOT IN ('CANCELLED', 'FAILED')) as real_total_spent
      FROM customers c
      LEFT JOIN mango_varieties v ON v.id = c.preferred_variety_id
      ORDER BY real_total_spent DESC
    `).all();

    return NextResponse.json({ success: true, customers });
  } catch (err: any) {
    console.error('Admin customers GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
