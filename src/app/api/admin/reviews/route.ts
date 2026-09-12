import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    ensureDatabaseReady();
    const db = getDatabase();

    let query = `
      SELECT 
        r.id, r.product_id, r.customer_name, r.city, r.rating, r.comment,
        r.is_verified_purchase, r.status, r.photos_json, r.helpful_count, r.created_at,
        p.name as product_name, v.name as variety_name
      FROM customer_reviews r
      JOIN products p ON p.id = r.product_id
      JOIN mango_varieties v ON v.id = p.variety_id
    `;
    const params: any[] = [];

    if (status) {
      query += ` WHERE r.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC LIMIT 100`;

    const reviews = db.prepare(query).all(...params);

    return NextResponse.json({
      success: true,
      reviews: reviews.map((r: any) => ({
        ...r,
        photos: r.photos_json ? JSON.parse(r.photos_json) : []
      }))
    });
  } catch (err: any) {
    console.error('Error fetching admin reviews:', err);
    return NextResponse.json({ error: 'Failed to retrieve reviews' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Review ID and status are required.' }, { status: 400 });
    }

    if (!['APPROVED', 'PENDING', 'REJECTED', 'HIDDEN'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
    }

    ensureDatabaseReady();
    const db = getDatabase();

    db.prepare(`
      UPDATE customer_reviews
      SET status = ?, is_approved = ?
      WHERE id = ?
    `).run(status, status === 'APPROVED' ? 1 : 0, id);

    return NextResponse.json({
      success: true,
      message: `Review marked as ${status}.`
    });
  } catch (err: any) {
    console.error('Error updating review status:', err);
    return NextResponse.json({ error: 'Failed to update review status' }, { status: 500 });
  }
}
