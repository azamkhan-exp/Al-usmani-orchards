import { getDatabase, runTransaction } from '../db';
import crypto from 'node:crypto';

export interface StockReservationItem {
  packageSizeId: string;
  quantity: number;
}

export async function reserveInventory(
  items: StockReservationItem[],
  referenceId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  return await runTransaction(async (db) => {
    for (const item of items) {
      // Fetch current inventory record with row locking
      const inv = await db.prepare(`
        SELECT id, package_size_id, available_stock, reserved_stock, total_stock
        FROM inventory
        WHERE package_size_id = ?
      `).get(item.packageSizeId) as {
        id: string;
        package_size_id: string;
        available_stock: number;
        reserved_stock: number;
        total_stock: number;
      } | undefined;

      if (!inv) {
        return { success: false, error: `Inventory not configured for package size ${item.packageSizeId}` };
      }

      if (Number(inv.available_stock) < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for package size ${item.packageSizeId}. Requested ${item.quantity}, available ${inv.available_stock}`
        };
      }

      const newAvailable = Number(inv.available_stock) - item.quantity;
      const newReserved = Number(inv.reserved_stock) + item.quantity;

      const updateResult = await db.prepare(`
        UPDATE inventory 
        SET available_stock = available_stock - ?, reserved_stock = reserved_stock + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND available_stock >= ?
      `).run(item.quantity, item.quantity, inv.id, item.quantity);

      if ((updateResult as any).changes === 0) {
        return {
          success: false,
          error: `Insufficient stock or concurrent reservation conflict for package size ${item.packageSizeId}`
        };
      }

      // Record in ledger
      const txId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO inventory_transactions (
          id, package_size_id, transaction_type, quantity, balance_after,
          reason, reference_id, created_by, created_at
        ) VALUES (?, ?, 'PURCHASE_RESERVE', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        txId,
        item.packageSizeId,
        -item.quantity,
        newAvailable,
        `Order reservation for reference ${referenceId}`,
        referenceId,
        userId || 'system'
      );
    }

    return { success: true };
  });
}

export async function commitOrderInventory(orderId: string, userId?: string): Promise<void> {
  await runTransaction(async (db) => {
    const items = await db.prepare(`
      SELECT package_size_id, quantity, batch_id
      FROM order_items
      WHERE order_id = ?
    `).all(orderId) as Array<{ package_size_id: string; quantity: number; batch_id: string | null }>;

    for (const item of items) {
      const inv = await db.prepare(`
        SELECT id, reserved_stock, sold_stock, total_stock, available_stock
        FROM inventory
        WHERE package_size_id = ?
      `).get(item.package_size_id) as any;

      if (inv) {
        const newReserved = Math.max(0, Number(inv.reserved_stock) - item.quantity);
        const newSold = Number(inv.sold_stock) + item.quantity;
        const newTotal = Math.max(0, Number(inv.total_stock) - item.quantity);

        await db.prepare(`
          UPDATE inventory
          SET reserved_stock = ?, sold_stock = ?, total_stock = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newReserved, newSold, newTotal, inv.id);

        const txId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO inventory_transactions (
            id, package_size_id, batch_id, transaction_type, quantity, balance_after,
            reason, reference_id, created_by, created_at
          ) VALUES (?, ?, ?, 'ORDER_COMMIT', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          txId,
          item.package_size_id,
          item.batch_id,
          -item.quantity,
          Number(inv.available_stock),
          `Committed order ${orderId}`,
          orderId,
          userId || 'system'
        );
      }
    }
  });
}

export async function releaseReservedInventory(orderId: string, reason = 'Order Cancelled', userId?: string): Promise<void> {
  await runTransaction(async (db) => {
    const items = await db.prepare(`
      SELECT package_size_id, quantity
      FROM order_items
      WHERE order_id = ?
    `).all(orderId) as Array<{ package_size_id: string; quantity: number }>;

    for (const item of items) {
      const inv = await db.prepare(`
        SELECT id, available_stock, reserved_stock
        FROM inventory
        WHERE package_size_id = ?
      `).get(item.package_size_id) as any;

      if (inv) {
        const releaseQty = Math.min(Number(inv.reserved_stock), item.quantity);
        const newAvailable = Number(inv.available_stock) + releaseQty;
        const newReserved = Number(inv.reserved_stock) - releaseQty;

        await db.prepare(`
          UPDATE inventory
          SET available_stock = ?, reserved_stock = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newAvailable, newReserved, inv.id);

        const txId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO inventory_transactions (
            id, package_size_id, transaction_type, quantity, balance_after,
            reason, reference_id, created_by, created_at
          ) VALUES (?, ?, 'ORDER_CANCEL_RELEASE', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          txId,
          item.package_size_id,
          releaseQty,
          newAvailable,
          reason,
          orderId,
          userId || 'system'
        );
      }
    }
  });
}

export async function adjustStockManually(params: {
  packageSizeId: string;
  batchId?: string;
  newAvailableStock: number;
  reason: string;
  userId: string;
}): Promise<void> {
  await runTransaction(async (db) => {
    const inv = await db.prepare(`
      SELECT id, available_stock, reserved_stock, total_stock
      FROM inventory
      WHERE package_size_id = ?
    `).get(params.packageSizeId) as any;

    if (!inv) {
      throw new Error(`Inventory not found for package size ${params.packageSizeId}`);
    }

    const delta = params.newAvailableStock - Number(inv.available_stock);
    const newTotal = Number(inv.total_stock) + delta;

    await db.prepare(`
      UPDATE inventory
      SET available_stock = ?, total_stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(params.newAvailableStock, newTotal, inv.id);

    const txId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO inventory_transactions (
        id, package_size_id, batch_id, transaction_type, quantity, balance_after,
        reason, created_by, created_at
      ) VALUES (?, ?, ?, 'MANUAL_ADJUST', ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      txId,
      params.packageSizeId,
      params.batchId || null,
      delta,
      params.newAvailableStock,
      params.reason,
      params.userId
    );
  });
}
