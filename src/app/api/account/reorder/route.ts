import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { assertFeatureEnabled } from '@/lib/services/features.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const guard = assertFeatureEnabled('buy_again');
  if (!guard.enabled) {
    return NextResponse.json({ error: guard.error, code: 'FEATURE_DISABLED' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    ensureDatabaseReady();
    const db = getDatabase();

    const customer = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(user.id) as any;
    if (!customer) {
      return NextResponse.json({ error: 'Customer account not found.' }, { status: 404 });
    }

    // IDOR verification: order must belong to this customer
    const order = db.prepare(`
      SELECT id, order_number, status 
      FROM orders 
      WHERE id = ? AND (customer_id = ? OR guest_email = ?)
    `).get(orderId, customer.id, user.email) as any;

    if (!order) {
      return NextResponse.json({ error: 'Order not found or access denied.' }, { status: 404 });
    }

    // Fetch items from historical order
    const historicalItems = db.prepare(`
      SELECT product_id, package_size_id, quantity, variety_name, package_name
      FROM order_items
      WHERE order_id = ?
    `).all(orderId) as any[];

    if (historicalItems.length === 0) {
      return NextResponse.json({ error: 'No items found in this order.' }, { status: 400 });
    }

    // Revalidate CURRENT pricing, product status, and stock
    const reorderedItems: any[] = [];
    const unavailableItems: string[] = [];

    for (const it of historicalItems) {
      const currentPkg = db.prepare(`
        SELECT 
          ps.id as package_size_id,
          ps.name as package_name,
          ps.weight_kg,
          ps.base_price,
          ps.sale_price,
          COALESCE(ps.sale_price, ps.base_price) as unit_price,
          p.id as product_id,
          p.name as product_name,
          p.primary_image,
          p.status as product_status,
          v.name as variety_name,
          COALESCE(inv.available_stock, 0) as available_stock
        FROM package_sizes ps
        JOIN products p ON p.id = ps.product_id
        JOIN mango_varieties v ON v.id = p.variety_id
        LEFT JOIN inventory inv ON inv.package_size_id = ps.id
        WHERE ps.id = ? AND ps.is_active = 1 AND p.status = 'ACTIVE' AND v.is_active = 1
      `).get(it.package_size_id) as any;

      if (!currentPkg) {
        unavailableItems.push(`${it.variety_name} (${it.package_name}) - Currently not offered`);
        continue;
      }

      if (currentPkg.available_stock <= 0) {
        unavailableItems.push(`${it.variety_name} (${it.package_name}) - Temporarily sold out`);
        continue;
      }

      const safeQuantity = Math.min(it.quantity, currentPkg.available_stock);

      reorderedItems.push({
        packageSizeId: currentPkg.package_size_id,
        productId: currentPkg.product_id,
        productName: currentPkg.product_name,
        varietyName: currentPkg.variety_name,
        packageName: currentPkg.package_name,
        weightKg: currentPkg.weight_kg,
        unitPrice: currentPkg.unit_price,
        quantity: safeQuantity,
        image: currentPkg.primary_image
      });
    }

    if (reorderedItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'None of the items from this previous order are currently available in harvest stock.',
        unavailableItems
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      items: reorderedItems,
      unavailableItems,
      message: `Successfully re-verified ${reorderedItems.length} crate(s) with live orchard pricing.`
    });
  } catch (err: any) {
    console.error('Error processing reorder:', err);
    return NextResponse.json({ error: 'Failed to process reorder request' }, { status: 500 });
  }
}
