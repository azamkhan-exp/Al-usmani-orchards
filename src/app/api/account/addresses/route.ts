import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, runTransaction } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';
import crypto from 'node:crypto';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const customer = await db.prepare('SELECT id FROM customers WHERE user_id = ? OR email = ?').get(user.id, user.email) as any;
    if (!customer) {
      return NextResponse.json({ success: true, addresses: [] });
    }

    const addresses = await db.prepare(`
      SELECT * FROM customer_addresses
      WHERE customer_id = ?
      ORDER BY is_default DESC, id ASC
    `).all(customer.id);

    return NextResponse.json({ success: true, addresses });
  } catch (err: any) {
    console.error('Customer addresses fetch error:', err);
    return NextResponse.json({ error: 'Failed to retrieve addresses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { label, recipientName, phone, streetAddress, area, city, province, postalCode, isDefault } = body;

    if (!recipientName || !phone || !streetAddress || !city) {
      return NextResponse.json({ error: 'Recipient name, phone, address, and city are required' }, { status: 400 });
    }

    const db = getDatabase();
    let customer = await db.prepare('SELECT id FROM customers WHERE user_id = ? OR email = ?').get(user.id, user.email) as any;
    if (!customer) {
      const custId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO customers (id, user_id, full_name, email, phone, city, segment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'NEW', datetime('now'))
      `).run(custId, user.id, user.name, user.email, phone, city);
      customer = { id: custId };
    }

    const addressId = crypto.randomUUID();

    if (isDefault) {
      await db.prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?').run(customer.id);
    }

    await db.prepare(`
      INSERT INTO customer_addresses (
        id, customer_id, label, recipient_name, phone, street_address, area, city, province, postal_code, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      addressId,
      customer.id,
      label || 'Home',
      recipientName.trim(),
      phone.trim(),
      streetAddress.trim(),
      area || '',
      city.trim(),
      province || 'Punjab',
      postalCode || '',
      isDefault ? 1 : 0
    );

    return NextResponse.json({ success: true, addressId });
  } catch (err: any) {
    console.error('Customer address create error:', err);
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
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
    const { id, label, recipientName, phone, streetAddress, area, city, province, postalCode, isDefault } = body;

    if (!id || !recipientName || !phone || !streetAddress || !city) {
      return NextResponse.json({ error: 'Address ID, recipient name, phone, address, and city are required' }, { status: 400 });
    }

    const db = getDatabase();
    const customer = await db.prepare('SELECT id FROM customers WHERE user_id = ? OR email = ?').get(user.id, user.email) as any;
    if (!customer) {
      return NextResponse.json({ error: 'Customer record not found' }, { status: 404 });
    }

    // Verify address belongs to authenticated customer (IDOR Protection)
    const existing = await db.prepare('SELECT id FROM customer_addresses WHERE id = ? AND customer_id = ?').get(id, customer.id);
    if (!existing) {
      return NextResponse.json({ error: 'Address not found or access denied' }, { status: 403 });
    }

    await runTransaction(async (database: any) => {
      if (isDefault) {
        await database.prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?').run(customer.id);
      }

      await database.prepare(`
        UPDATE customer_addresses
        SET
          label = ?,
          recipient_name = ?,
          phone = ?,
          street_address = ?,
          area = ?,
          city = ?,
          province = ?,
          postal_code = ?,
          is_default = ?
        WHERE id = ? AND customer_id = ?
      `).run(
        label || 'Home',
        recipientName.trim(),
        phone.trim(),
        streetAddress.trim(),
        area || '',
        city.trim(),
        province || 'Punjab',
        postalCode || '',
        isDefault ? 1 : 0,
        id,
        customer.id
      );
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Customer address update error:', err);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Address ID required' }, { status: 400 });
    }

    const db = getDatabase();
    const customer = await db.prepare('SELECT id FROM customers WHERE user_id = ? OR email = ?').get(user.id, user.email) as any;
    if (!customer) {
      return NextResponse.json({ error: 'Customer record not found' }, { status: 404 });
    }

    // Strict IDOR Protection: Address must belong to authenticated customer
    const result = await db.prepare('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?').run(id, customer.id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Address not found or access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Customer address delete error:', err);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
