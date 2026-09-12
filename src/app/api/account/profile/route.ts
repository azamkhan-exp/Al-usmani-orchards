import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    let customer = (await db.prepare(`
      SELECT id, user_id, full_name, email, phone, city, segment, total_spent, orders_count, referral_code, created_at
      FROM customers
      WHERE user_id = ? OR email = ?
    `).get(user.id, user.email)) as any;

    if (!customer) {
      // Ensure customer profile row exists
      const custId = crypto.randomUUID();
      const referralCode = `AUO-${Math.floor(1000 + Math.random() * 9000)}`;
      await db.prepare(`
        INSERT INTO customers (id, user_id, full_name, email, phone, city, segment, total_spent, orders_count, referral_code, created_at)
        VALUES (?, ?, ?, ?, ?, 'Lahore', 'NEW', 0, 0, ?, CURRENT_TIMESTAMP)
      `).run(custId, user.id, user.name, user.email, user.phone || null, referralCode);
      customer = {
        id: custId,
        user_id: user.id,
        full_name: user.name,
        email: user.email,
        phone: user.phone,
        city: 'Lahore',
        segment: 'NEW',
        total_spent: 0,
        orders_count: 0,
        referral_code: referralCode,
        created_at: new Date().toISOString()
      };
    } else if (!customer.user_id) {
      await db.prepare('UPDATE customers SET user_id = ? WHERE id = ?').run(user.id, customer.id);
      customer.user_id = user.id;
    }

    // Quick summary counts
    const addressCountRow = (await db.prepare('SELECT COUNT(*) as count FROM customer_addresses WHERE customer_id = ?').get(customer.id)) as any;
    const addressCount = Number(addressCountRow?.count || 0);

    const orderCountRow = (await db.prepare('SELECT COUNT(*) as count FROM orders WHERE customer_id = ? OR LOWER(guest_email) = ?').get(customer.id, user.email.toLowerCase())) as any;
    const orderCount = Number(orderCountRow?.count || 0);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified,
        role: user.role
      },
      customer,
      stats: {
        addressCount,
        orderCount
      }
    });
  } catch (err: any) {
    console.error('Customer profile fetch error:', err);
    return NextResponse.json({ error: 'Failed to retrieve profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, city } = body;

    if (name && name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 });
    }

    const db = getDatabase();

    await db.prepare(`
      UPDATE users
      SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name?.trim() || null, phone?.trim() || null, user.id);

    await db.prepare(`
      UPDATE customers
      SET
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        city = COALESCE(?, city)
      WHERE user_id = ? OR email = ?
    `).run(name?.trim() || null, phone?.trim() || null, city?.trim() || null, user.id, user.email);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Customer profile update error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
