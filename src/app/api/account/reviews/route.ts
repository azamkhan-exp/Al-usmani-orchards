import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { assertFeatureEnabled, isFeatureEnabled } from '@/lib/services/features.service';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await assertFeatureEnabled('product_reviews');
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
      return NextResponse.json({ success: true, reviews: [] });
    }

    const reviews = await db.prepare(`
      SELECT 
        r.id,
        r.product_id,
        r.rating,
        r.comment,
        r.city,
        r.status,
        r.photos_json,
        r.is_verified_purchase,
        r.created_at,
        p.name as product_name,
        p.primary_image,
        v.name as variety_name
      FROM customer_reviews r
      JOIN products p ON p.id = r.product_id
      JOIN mango_varieties v ON v.id = p.variety_id
      WHERE r.customer_id = ? OR r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(customer.id, user.id);

    return NextResponse.json({
      success: true,
      reviews: reviews.map((r: any) => ({
        ...r,
        photos: r.photos_json ? JSON.parse(r.photos_json) : []
      }))
    });
  } catch (err: any) {
    console.error('Error fetching customer reviews:', err);
    return NextResponse.json({ error: 'Failed to retrieve reviews' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await assertFeatureEnabled('product_reviews');
  if (!guard.enabled) {
    return NextResponse.json({ error: guard.error, code: 'FEATURE_DISABLED' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to submit a review.' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, rating, comment, photos, city } = body;

    if (!productId || !rating || !comment) {
      return NextResponse.json({ error: 'Product ID, rating (1-5), and comment are required.' }, { status: 400 });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5.' }, { status: 400 });
    }

    // Check photo reviews flag
    let photosList: string[] = [];
    if (photos && Array.isArray(photos) && photos.length > 0) {
      if (await isFeatureEnabled('photo_reviews')) {
        photosList = photos.slice(0, 3);
      }
    }

    ensureDatabaseReady();
    const db = getDatabase();

    let customer = await db.prepare('SELECT id, city, full_name FROM customers WHERE user_id = ?').get(user.id) as any;
    if (!customer) {
      const customerId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO customers (id, user_id, full_name, email, phone, city, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(customerId, user.id, user.name || 'Valued Patron', user.email, (user as any).phone || null, city || 'Multan');
      customer = { id: customerId, city: city || 'Multan', full_name: user.name || 'Valued Patron' };
    }

    // Check if verified purchase
    const verifiedOrder = await db.prepare(`
      SELECT o.id 
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE (o.customer_id = ? OR o.guest_email = ?) AND oi.product_id = ? AND o.status = 'DELIVERED'
      LIMIT 1
    `).get(customer.id, user.email, productId);

    const isVerified = Boolean(verifiedOrder);
    const reviewId = `rev_${crypto.randomUUID()}`;

    await db.prepare(`
      INSERT INTO customer_reviews (
        id, product_id, customer_name, city, rating, comment, is_verified_purchase,
        is_approved, customer_id, user_id, status, photos_json, helpful_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'APPROVED', ?, 0, CURRENT_TIMESTAMP)
    `).run(
      reviewId,
      productId,
      user.name || customer.full_name || 'Valued Patron',
      city || customer.city || 'Pakistan',
      numRating,
      comment.trim(),
      isVerified ? 1 : 0,
      customer.id,
      user.id,
      JSON.stringify(photosList)
    );

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your tasting review has been published.'
    });
  } catch (err: any) {
    console.error('Error submitting review:', err);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
