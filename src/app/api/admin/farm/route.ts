import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { recordAuditLog } from '@/lib/services/audit.service';
import crypto from 'node:crypto';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'farm:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDatabase();

    const orchards = await db.prepare('SELECT * FROM farm_orchards ORDER BY total_acres DESC').all();
    const blocks = await db.prepare(`
      SELECT fb.*, fo.name as orchard_name, v.name as variety_name
      FROM farm_blocks fb
      JOIN farm_orchards fo ON fo.id = fb.orchard_id
      JOIN mango_varieties v ON v.id = fb.variety_id
      ORDER BY fb.block_code ASC
    `).all();

    const batches = await db.prepare(`
      SELECT 
        hb.*,
        v.name as variety_name,
        fo.name as orchard_name,
        fb.block_code
      FROM harvest_batches hb
      JOIN mango_varieties v ON v.id = hb.variety_id
      JOIN farm_orchards fo ON fo.id = hb.orchard_id
      LEFT JOIN farm_blocks fb ON fb.id = hb.block_id
      ORDER BY hb.harvest_date DESC
    `).all();

    return NextResponse.json({ success: true, orchards, blocks, batches });
  } catch (err: any) {
    console.error('Admin farm GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch farm data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'farm:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { batchCode, varietyId, orchardId, blockId, harvestDate, expectedDispatchDate, totalYieldKg, notes } = body;

    if (!batchCode || !varietyId || !orchardId || !harvestDate || !totalYieldKg) {
      return NextResponse.json({ error: 'Missing required harvest fields' }, { status: 400 });
    }

    const db = getDatabase();
    const batchId = crypto.randomUUID();
    const yieldKg = Number(totalYieldKg);

    db.prepare(`
      INSERT INTO harvest_batches (
        id, batch_code, variety_id, orchard_id, block_id, harvest_date,
        expected_dispatch_date, total_yield_kg, available_kg, reserved_kg,
        sold_kg, wastage_kg, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'HARVESTED', ?)
    `).run(
      batchId,
      batchCode.trim().toUpperCase(),
      varietyId,
      orchardId,
      blockId || null,
      harvestDate,
      expectedDispatchDate || harvestDate,
      yieldKg,
      yieldKg,
      notes || ''
    );

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'HARVEST_BATCH_RECORDED',
      resourceType: 'HARVEST_BATCH',
      resourceId: batchId,
      newState: { batchCode, varietyId, yieldKg }
    });

    return NextResponse.json({ success: true, batchId });
  } catch (err: any) {
    console.error('Admin farm POST error:', err);
    return NextResponse.json({ error: 'Failed to record harvest batch' }, { status: 500 });
  }
}
