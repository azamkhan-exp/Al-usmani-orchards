import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { adjustStockManually } from '@/lib/services/inventory.service';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'inventory:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDatabase();

    // Inventory levels by package size
    const inventoryList = db.prepare(`
      SELECT 
        inv.id as inventory_id,
        inv.total_stock,
        inv.available_stock,
        inv.reserved_stock,
        inv.sold_stock,
        inv.damaged_stock,
        inv.low_stock_threshold,
        ps.id as package_size_id,
        ps.name as package_name,
        ps.weight_kg,
        ps.sku,
        p.name as product_name,
        v.name as variety_name
      FROM inventory inv
      JOIN package_sizes ps ON ps.id = inv.package_size_id
      JOIN products p ON p.id = ps.product_id
      JOIN mango_varieties v ON v.id = p.variety_id
      ORDER BY v.name ASC, ps.weight_kg ASC
    `).all();

    // Harvest Batches
    const batches = db.prepare(`
      SELECT 
        hb.*,
        v.name as variety_name,
        fo.name as orchard_name,
        fb.block_code
      FROM harvest_batches hb
      JOIN mango_varieties v ON v.id = hb.variety_id
      JOIN farm_orchards fo ON fo.id = hb.orchard_id
      LEFT JOIN farm_blocks fb ON fb.id = hb.block_id
      ORDER BY datetime(hb.harvest_date) DESC
    `).all();

    // Recent inventory transactions (Ledger)
    const transactions = db.prepare(`
      SELECT 
        it.*,
        ps.name as package_name,
        p.name as product_name
      FROM inventory_transactions it
      JOIN package_sizes ps ON ps.id = it.package_size_id
      JOIN products p ON p.id = ps.product_id
      ORDER BY datetime(it.created_at) DESC
      LIMIT 50
    `).all();

    return NextResponse.json({
      success: true,
      inventory: inventoryList,
      batches,
      transactions
    });
  } catch (err: any) {
    console.error('Admin inventory GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'inventory:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { packageSizeId, newAvailableStock, reason, batchId } = body;

    if (!packageSizeId || newAvailableStock === undefined || !reason) {
      return NextResponse.json({ error: 'Package size, new stock, and reason are required' }, { status: 400 });
    }

    adjustStockManually({
      packageSizeId,
      newAvailableStock: Number(newAvailableStock),
      reason: reason.trim(),
      batchId,
      userId: user.name
    });

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'STOCK_MANUALLY_ADJUSTED',
      resourceType: 'INVENTORY',
      resourceId: packageSizeId,
      newState: { newAvailableStock, reason }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin inventory POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to adjust stock' }, { status: 500 });
  }
}
