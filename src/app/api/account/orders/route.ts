import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber');

    const db = getDatabase();

    // Query customer profile record
    const customer = db.prepare('SELECT id, email, referral_code FROM customers WHERE user_id = ? OR email = ?').get(user.id, user.email) as any;

    let query = `
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.subtotal,
        o.discount_amount,
        o.shipping_fee,
        o.payment_method,
        o.payment_status,
        o.tracking_number,
        o.is_gift,
        o.gift_recipient,
        o.created_at,
        c.name as courier_name
      FROM orders o
      LEFT JOIN couriers c ON c.id = o.courier_id
      WHERE (o.customer_id = ? OR LOWER(o.guest_email) = ?)
    `;

    const params: any[] = [customer?.id || user.id, user.email.toLowerCase()];

    if (orderNumber) {
      query += ` AND (UPPER(o.order_number) = ? OR o.id = ?)`;
      params.push(orderNumber.toUpperCase(), orderNumber);
    }

    query += ` ORDER BY o.created_at DESC`;

    const rawOrders = db.prepare(query).all(...params) as any[];

    const getItems = db.prepare(`
      SELECT 
        id,
        variety_name,
        package_name,
        unit_weight_kg,
        unit_price,
        quantity,
        subtotal
      FROM order_items
      WHERE order_id = ?
    `);

    const orders = rawOrders.map((ord) => ({
      ...ord,
      items: getItems.all(ord.id)
    }));

    return NextResponse.json({
      success: true,
      orders,
      customer: customer || { referral_code: 'AUO-VIP' }
    });
  } catch (err: any) {
    console.error('Customer orders fetch error:', err);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}
