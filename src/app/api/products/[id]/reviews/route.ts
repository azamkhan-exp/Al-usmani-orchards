import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { isFeatureEnabled } from '@/lib/services/features.service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isFeatureEnabled('product_reviews'))) {
    return NextResponse.json({ success: true, reviews: [], aggregate: { averageRating: 5, totalCount: 0 } });
  }

  try {
    const { id: productId } = await params;
    ensureDatabaseReady();
    const db = getDatabase();

    const reviews = await db.prepare(`
      SELECT 
        id, customer_name, city, rating, comment, is_verified_purchase,
        photos_json, helpful_count, created_at
      FROM customer_reviews
      WHERE product_id = ? AND (status = 'APPROVED' OR status IS NULL)
      ORDER BY created_at DESC
      LIMIT 50
    `).all(productId);

    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating
      FROM customer_reviews
      WHERE product_id = ? AND (status = 'APPROVED' OR status IS NULL)
    `).get(productId) as any;

    return NextResponse.json({
      success: true,
      reviews: reviews.map((r: any) => ({
        ...r,
        photos: r.photos_json ? JSON.parse(r.photos_json) : []
      })),
      aggregate: {
        averageRating: Number(stats?.avg_rating || 5).toFixed(1),
        totalCount: stats?.total_reviews || 0
      }
    });
  } catch (err: any) {
    console.error('Error fetching product reviews:', err);
    return NextResponse.json({ error: 'Failed to retrieve product reviews' }, { status: 500 });
  }
}
