import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { assertFeatureEnabled } from '@/lib/services/features.service';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const guard = await assertFeatureEnabled('back_in_stock');
  if (!guard.enabled) {
    return NextResponse.json({ error: guard.error, code: 'FEATURE_DISABLED' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { productId, packageSizeId, email, phone } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    if (!email && !phone) {
      return NextResponse.json({ error: 'Please provide either an email or mobile phone number for stock notifications.' }, { status: 400 });
    }

    ensureDatabaseReady();
    const db = getDatabase();

    const user = await getCurrentUser();
    let customerId: string | null = null;
    if (user) {
      const cust = (await db.prepare('SELECT id FROM customers WHERE user_id = ?').get(user.id)) as any;
      customerId = cust?.id || null;
    }

    // Verify product exists
    const prod = (await db.prepare('SELECT name FROM products WHERE id = ?').get(productId)) as any;
    if (!prod) {
      return NextResponse.json({ error: 'Selected variety does not exist.' }, { status: 404 });
    }

    const subId = `sub_${crypto.randomUUID()}`;

    await db.prepare(`
      INSERT INTO back_in_stock_subscriptions (
        id, product_id, package_size_id, email, phone, customer_id, notified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `).run(
      subId,
      productId,
      packageSizeId || null,
      email ? email.trim().toLowerCase() : null,
      phone ? phone.trim() : null,
      customerId
    );

    return NextResponse.json({
      success: true,
      message: `You're on the royal reserve list! We will notify you immediately via ${email ? 'email' : ''}${email && phone ? ' and ' : ''}${phone ? 'WhatsApp' : ''} once this harvest is available.`
    });
  } catch (err: any) {
    console.error('Error creating back-in-stock alert:', err);
    return NextResponse.json({ error: 'Failed to record stock notification preference' }, { status: 500 });
  }
}
