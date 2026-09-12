import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { updateOrderStatus } from '@/lib/services/order.service';
import { recordAuditLog } from '@/lib/services/audit.service';
import { archiveOrder, restoreOrder } from '@/lib/services/data-management.service';

export async function GET(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'orders:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();

    const db = getDatabase();

    let query = `
      SELECT 
        o.*,
        COALESCE(c.full_name, o.guest_name, 'Guest') as customer_name,
        COALESCE(c.phone, o.guest_phone) as customer_phone,
        COALESCE(c.city, 'Pakistan') as city,
        cou.name as courier_name
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN couriers cou ON cou.id = o.courier_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status === 'ARCHIVED') {
      query += ' AND o.is_archived = 1';
    } else if (status === 'DEMO') {
      query += ' AND o.is_demo = 1';
    } else {
      query += ' AND (o.is_archived = 0 OR o.is_archived IS NULL)';
      if (status && status !== 'ALL') {
        query += ' AND o.status = ?';
        params.push(status);
      }
    }

    if (search) {
      query += ` AND (LOWER(o.order_number) LIKE ? OR LOWER(COALESCE(c.full_name, o.guest_name, '')) LIKE ? OR LOWER(o.tracking_number) LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY datetime(o.created_at) DESC';

    const orders = db.prepare(query).all(...params) as any[];

    // Fetch order items for each order
    const getItems = db.prepare(`
      SELECT variety_name, package_name, unit_weight_kg, unit_price, quantity, subtotal
      FROM order_items
      WHERE order_id = ?
    `);

    const getTimeline = db.prepare(`
      SELECT status, title, description, created_at
      FROM order_timeline
      WHERE order_id = ?
      ORDER BY datetime(created_at) ASC
    `);

    const enrichedOrders = orders.map((ord) => ({
      ...ord,
      items: getItems.all(ord.id),
      timeline: getTimeline.all(ord.id)
    }));

    return NextResponse.json({ success: true, orders: enrichedOrders });
  } catch (err: any) {
    console.error('Admin orders error:', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'orders:modify')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, status, notes, paymentStatus, action } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (action === 'ARCHIVE') {
      const success = archiveOrder(orderId, user.id, user.email);
      return NextResponse.json({ success, message: success ? 'Order archived.' : 'Failed to archive order.' });
    }

    if (action === 'RESTORE') {
      const success = restoreOrder(orderId, user.id, user.email);
      return NextResponse.json({ success, message: success ? 'Order restored.' : 'Failed to restore order.' });
    }

    const db = getDatabase();
    const existingOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (status && status !== existingOrder.status) {
      updateOrderStatus(orderId, status, notes, user.id);
    }

    if (paymentStatus && paymentStatus !== existingOrder.payment_status) {
      db.prepare(`
        UPDATE orders 
        SET payment_status = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(paymentStatus, orderId);

      if (paymentStatus === 'PAID') {
        db.prepare(`
          INSERT INTO payments (id, order_id, amount, payment_method, status, verified_by, created_at)
          VALUES (?, ?, ?, ?, 'PAID', ?, datetime('now'))
        `).run(crypto.randomUUID(), orderId, existingOrder.total_amount, existingOrder.payment_method, user.name);

        // If COD, mark receivable settled
        db.prepare(`
          UPDATE accounts_receivable 
          SET status = 'SETTLED', amount_collected = amount_due, settled_at = datetime('now')
          WHERE order_id = ?
        `).run(orderId);
      }
    }

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ORDER_UPDATED',
      resourceType: 'ORDER',
      resourceId: orderId,
      previousState: { status: existingOrder.status, paymentStatus: existingOrder.payment_status },
      newState: { status: status || existingOrder.status, paymentStatus: paymentStatus || existingOrder.payment_status }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Update order error:', err);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
