import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';

export async function GET(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim().toUpperCase();

    if (!query) {
      return NextResponse.json({ error: 'Tracking number or Order ID is required.' }, { status: 400 });
    }

    const db = getDatabase();

    // Query by order_number or tracking_number
    const order = await db.prepare(`
      SELECT 
        o.id, o.order_number, o.status, o.subtotal, o.discount_amount,
        o.shipping_fee, o.total_amount, o.payment_method, o.payment_status,
        o.is_gift, o.gift_recipient, o.gift_message, o.tracking_number, o.created_at,
        c.name as courier_name, c.code as courier_code, c.tracking_url_template, c.logo_url as courier_logo
      FROM orders o
      LEFT JOIN couriers c ON c.id = o.courier_id
      WHERE UPPER(o.order_number) = ? OR UPPER(o.tracking_number) = ?
    `).get(query, query) as any;

    if (!order) {
      return NextResponse.json({ error: 'No consignment found matching this reference.' }, { status: 404 });
    }

    // Fetch items
    const items = await db.prepare(`
      SELECT variety_name, package_name, unit_weight_kg, unit_price, quantity, subtotal
      FROM order_items
      WHERE order_id = ?
    `).all(order.id);

    // Fetch timeline
    const timeline = await db.prepare(`
      SELECT status, title, description, created_at
      FROM order_timeline
      WHERE order_id = ?
      ORDER BY created_at ASC
    `).all(order.id);

    // Fetch shipment tracking events if available
    const trackingEvents = await db.prepare(`
      SELECT ste.event_time, ste.status, ste.location, ste.description
      FROM shipments s
      JOIN shipment_tracking_events ste ON ste.shipment_id = s.id
      WHERE s.order_id = ?
      ORDER BY ste.event_time ASC
    `).all(order.id);

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items,
        timeline,
        trackingEvents
      }
    });
  } catch (err: any) {
    console.error('Track order error:', err);
    return NextResponse.json({ error: 'Failed to look up tracking details' }, { status: 500 });
  }
}
