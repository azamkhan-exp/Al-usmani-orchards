import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, runTransaction } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { recordAuditLog } from '@/lib/services/audit.service';
import crypto from 'node:crypto';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'promotions:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDatabase();
    const promotions = (await db.prepare('SELECT * FROM promotions ORDER BY created_at DESC').all()) as any[];

    const getRules = db.prepare('SELECT * FROM tiered_discount_rules WHERE promotion_id = ? ORDER BY min_units ASC');
    const enriched = await Promise.all(
      promotions.map(async (p) => ({
        ...p,
        tieredRules: await getRules.all(p.id)
      }))
    );

    return NextResponse.json({ success: true, promotions: enriched });
  } catch (err: any) {
    console.error('Admin promotions GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'promotions:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, discountType, discountValue, minOrderValue, maxDiscount, expiresAt, isStackable } = body;

    if (!name || !discountType) {
      return NextResponse.json({ error: 'Name and discount type are required' }, { status: 400 });
    }

    const db = getDatabase();
    const id = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO promotions (
        id, name, code, discount_type, discount_value, min_order_value,
        max_discount, expires_at, is_stackable, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      name.trim(),
      code ? code.trim().toUpperCase() : null,
      discountType,
      Number(discountValue || 0),
      Number(minOrderValue || 0),
      maxDiscount ? Number(maxDiscount) : null,
      expiresAt || null,
      isStackable ? 1 : 0
    );

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'PROMOTION_CREATED',
      resourceType: 'PROMOTION',
      resourceId: id,
      newState: { name, code, discountType, discountValue }
    });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Admin promotions POST error:', err);
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'promotions:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, code, discountType, discountValue, minOrderValue, maxDiscount, expiresAt, isStackable, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
    }

    const db = getDatabase();
    const existing = (await db.prepare('SELECT * FROM promotions WHERE id = ?').get(id)) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    // Check if full edit or just active toggle
    if (name !== undefined || discountType !== undefined) {
      await db.prepare(`
        UPDATE promotions
        SET
          name = COALESCE(?, name),
          code = ?,
          discount_type = COALESCE(?, discount_type),
          discount_value = COALESCE(?, discount_value),
          min_order_value = COALESCE(?, min_order_value),
          max_discount = ?,
          expires_at = ?,
          is_stackable = COALESCE(?, is_stackable),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        name?.trim() || null,
        code ? code.trim().toUpperCase() : null,
        discountType || null,
        discountValue !== undefined ? Number(discountValue) : null,
        minOrderValue !== undefined ? Number(minOrderValue) : null,
        maxDiscount ? Number(maxDiscount) : null,
        expiresAt || null,
        isStackable !== undefined ? (isStackable ? 1 : 0) : null,
        isActive !== undefined ? (isActive ? 1 : 0) : null,
        id
      );

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'PROMOTION_UPDATED',
        resourceType: 'PROMOTION',
        resourceId: id,
        previousState: existing,
        newState: body
      });
    } else {
      // Simple toggle
      await db.prepare(`UPDATE promotions SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(
        isActive ? 1 : 0,
        id
      );

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'PROMOTION_TOGGLED',
        resourceType: 'PROMOTION',
        resourceId: id,
        newState: { isActive }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin promotions PUT error:', err);
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'promotions:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // query param fallback
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Promotion ID is required.' }, { status: 400 });
    }

    const result = await runTransaction(async (txDb) => {
      const existing = (await txDb.prepare('SELECT * FROM promotions WHERE id = ?').get(id)) as any;
      if (!existing) {
        return null;
      }

      // Delete associated tiered rules if any
      await txDb.prepare('DELETE FROM tiered_discount_rules WHERE promotion_id = ?').run(id);
      // Delete promotion
      await txDb.prepare('DELETE FROM promotions WHERE id = ?').run(id);

      return existing;
    });

    if (!result) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'PROMOTION_DELETED',
      resourceType: 'PROMOTION',
      resourceId: id,
      previousState: result
    });

    return NextResponse.json({ success: true, message: 'Promotion deleted successfully.' });
  } catch (err: any) {
    console.error('Admin promotions DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}
