import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { normalizeProduct } from '@/lib/serializers';

export async function GET() {
  try {
    ensureDatabaseReady();
    const db = getDatabase();

    const products = db.prepare(`
      SELECT 
        p.*,
        v.name as variety_name,
        v.slug as variety_slug,
        v.origin_city,
        v.sweetness_brix,
        v.aroma_level,
        v.fiber_level,
        v.acidity_level,
        v.flavor_notes
      FROM products p
      JOIN mango_varieties v ON v.id = p.variety_id
      WHERE p.status = 'ACTIVE'
      ORDER BY p.is_featured DESC, p.created_at ASC
    `).all() as any[];

    // Fetch dynamic package sizes with live inventory for each product
    const getPackages = db.prepare(`
      SELECT 
        ps.*,
        COALESCE(inv.available_stock, 0) as available_stock,
        COALESCE(inv.total_stock, 0) as total_stock
      FROM package_sizes ps
      LEFT JOIN inventory inv ON inv.package_size_id = ps.id
      WHERE ps.product_id = ? AND ps.is_active = 1
      ORDER BY ps.weight_kg ASC
    `);

    // Fetch reviews for each product
    const getReviews = db.prepare(`
      SELECT customer_name, city, rating, comment, is_verified_purchase, created_at
      FROM customer_reviews
      WHERE product_id = ? AND is_approved = 1
      ORDER BY created_at DESC
    `);

    const enrichedProducts = products.map((prod) => {
      const packages = getPackages.all(prod.id) as any[];
      const reviews = getReviews.all(prod.id);
      const avgRating = reviews.length > 0 
        ? Math.round((reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length) * 10) / 10 
        : 5.0;

      const normalized = normalizeProduct(prod, packages);
      return {
        ...normalized,
        reviews,
        reviewCount: reviews.length,
        averageRating: avgRating
      };
    });

    return NextResponse.json({ success: true, products: enrichedProducts });
  } catch (err: any) {
    console.error('Fetch products error:', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
