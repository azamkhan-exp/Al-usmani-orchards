import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { assertFeatureEnabled } from '@/lib/services/features.service';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await assertFeatureEnabled('wishlist');
  if (!guard.enabled) {
    return NextResponse.json({ error: guard.error, code: 'FEATURE_DISABLED' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    ensureDatabaseReady();
    const db = getDatabase();

    const customer = await db.prepare('SELECT id FROM customers WHERE user_id = ?').get(user.id) as any;
    if (!customer) {
      return NextResponse.json({ success: true, items: [] });
    }

    const items = await db.prepare(`
      SELECT 
        w.id as wishlist_id,
        w.created_at as saved_at,
        p.id as product_id,
        p.name as product_name,
        p.slug as product_slug,
        p.primary_image,
        v.name as variety_name,
        v.sweetness_brix,
        ps.id as package_size_id,
        ps.name as package_name,
        ps.weight_kg,
        COALESCE(ps.sale_price, ps.base_price) as price,
        ps.base_price,
        ps.sale_price,
        COALESCE(inv.available_stock, 0) as available_stock,
        (COALESCE(inv.available_stock, 0) > 0) as in_stock
      FROM wishlists w
      JOIN products p ON p.id = wishlists_p(p)
      JOIN mango_varieties v ON v.id = p.variety_id
      LEFT JOIN package_sizes ps ON ps.id = w.package_size_id
      LEFT JOIN inventory inv ON inv.package_size_id = ps.id
      WHERE w.customer_id = ?
      ORDER BY w.created_at DESC
    `.replace('wishlists_p(p)', 'w.product_id')).all(customer.id);

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    console.error('Error fetching customer wishlist:', err);
    return NextResponse.json({ error: 'Failed to retrieve wishlist items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await assertFeatureEnabled('wishlist');
  if (!guard.enabled) {
    return NextResponse.json({ error: guard.error, code: 'FEATURE_DISABLED' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to save harvest crates to your wishlist.' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, packageSizeId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    ensureDatabaseReady();
    const db = getDatabase();

    // Ensure customer record exists
    let customer = await db.prepare('SELECT id FROM customers WHERE user_id = ?').get(user.id) as any;
    if (!customer) {
      const customerId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO customers (id, user_id, full_name, email, phone, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(customerId, user.id, user.name || 'Valued Patron', user.email, (user as any).phone || null);
      customer = { id: customerId };
    }

    // Resolve package size if not passed
    let resolvedPackageId = packageSizeId;
    if (!resolvedPackageId) {
      const firstPkg = await db.prepare('SELECT id FROM package_sizes WHERE product_id = ? ORDER BY weight_kg ASC LIMIT 1').get(productId) as any;
      resolvedPackageId = firstPkg?.id || null;
    }

    const wishlistId = `wish_${crypto.randomUUID()}`;

    await db.prepare(`
      INSERT INTO wishlists (id, customer_id, product_id, package_size_id, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(customer_id, product_id, package_size_id) DO NOTHING
    `).run(wishlistId, customer.id, productId, resolvedPackageId);

    return NextResponse.json({
      success: true,
      message: 'Added to your Royal Harvest Wishlist.'
    });
  } catch (err: any) {
    console.error('Error adding to wishlist:', err);
    return NextResponse.json({ error: 'Failed to add item to wishlist' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await assertFeatureEnabled('wishlist');
  if (!guard.enabled) {
    return NextResponse.json({ error: guard.error, code: 'FEATURE_DISABLED' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const wishlistId = searchParams.get('id');
    const productId = searchParams.get('productId');

    ensureDatabaseReady();
    const db = getDatabase();

    const customer = await db.prepare('SELECT id FROM customers WHERE user_id = ?').get(user.id) as any;
    if (!customer) {
      return NextResponse.json({ error: 'Customer record not found' }, { status: 404 });
    }

    if (wishlistId) {
      await db.prepare('DELETE FROM wishlists WHERE id = ? AND customer_id = ?').run(wishlistId, customer.id);
    } else if (productId) {
      await db.prepare('DELETE FROM wishlists WHERE product_id = ? AND customer_id = ?').run(productId, customer.id);
    } else {
      return NextResponse.json({ error: 'Either wishlist id or productId is required.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Item removed from wishlist.'
    });
  } catch (err: any) {
    console.error('Error deleting from wishlist:', err);
    return NextResponse.json({ error: 'Failed to delete wishlist item' }, { status: 500 });
  }
}
