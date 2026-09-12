import { getDatabase, runTransaction } from '../db';
import crypto from 'node:crypto';

export interface StockReservationItem {
  packageSizeId: string;
  quantity: number;
}

export function reserveInventory(
  items: StockReservationItem[],
  referenceId: string,
  userId?: string
): { success: boolean; error?: string } {
  return runTransaction((db) => {
    for (const item of items) {
      // Fetch current inventory record with row locking
      const inv = db.prepare(`
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

      if (inv.available_stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for package size ${item.packageSizeId}. Requested ${item.quantity}, available ${inv.available_stock}`
        };
      }

      const newAvailable = inv.available_stock - item.quantity;
      const newReserved = inv.reserved_stock + item.quantity;

      const updateResult = db.prepare(`
        UPDATE inventory 
        SET available_stock = available_stock - ?, reserved_stock = reserved_stock + ?, updated_at = datetime('now')
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
      db.prepare(`
        INSERT INTO inventory_transactions (
          id, package_size_id, transaction_type, quantity, balance_after,
          reason, reference_id, created_by, created_at
        ) VALUES (?, ?, 'PURCHASE_RESERVE', ?, ?, ?, ?, ?, datetime('now'))
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

export function commitOrderInventory(orderId: string, userId?: string): void {
  runTransaction((db) => {
    const items = db.prepare(`
      SELECT package_size_id, quantity, batch_id
      FROM order_items
      WHERE order_id = ?
    `).all(orderId) as Array<{ package_size_id: string; quantity: number; batch_id: string | null }>;

    for (const item of items) {
      const inv = db.prepare(`
        SELECT id, reserved_stock, sold_stock, total_stock, available_stock
        FROM inventory
        WHERE package_size_id = ?
      `).get(item.package_size_id) as any;

      if (inv) {
        const newReserved = Math.max(0, inv.reserved_stock - item.quantity);
        const newSold = inv.sold_stock + item.quantity;
        const newTotal = Math.max(0, inv.total_stock - item.quantity);

        db.prepare(`
          UPDATE inventory
          SET reserved_stock = ?, sold_stock = ?, total_stock = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(newReserved, newSold, newTotal, inv.id);

        const txId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO inventory_transactions (
            id, package_size_id, batch_id, transaction_type, quantity, balance_after,
            reason, reference_id, created_by, created_at
          ) VALUES (?, ?, ?, 'ORDER_COMMIT', ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          txId,
          item.package_size_id,
          item.batch_id,
          -item.quantity,
          inv.available_stock,
          `Committed order ${orderId}`,
          orderId,
          userId || 'system'
        );
      }
    }
  });
}

export function releaseReservedInventory(orderId: string, reason = 'Order Cancelled', userId?: string): void {
  runTransaction((db) => {
    const items = db.prepare(`
      SELECT package_size_id, quantity
      FROM order_items
      WHERE order_id = ?
    `).all(orderId) as Array<{ package_size_id: string; quantity: number }>;

    for (const item of items) {
      const inv = db.prepare(`
        SELECT id, available_stock, reserved_stock
        FROM inventory
        WHERE package_size_id = ?
      `).get(item.package_size_id) as any;

      if (inv) {
        const releaseQty = Math.min(inv.reserved_stock, item.quantity);
        const newAvailable = inv.available_stock + releaseQty;
        const newReserved = inv.reserved_stock - releaseQty;

        db.prepare(`
          UPDATE inventory
          SET available_stock = ?, reserved_stock = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(newAvailable, newReserved, inv.id);

        const txId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO inventory_transactions (
            id, package_size_id, transaction_type, quantity, balance_after,
            reason, reference_id, created_by, created_at
          ) VALUES (?, ?, 'ORDER_CANCEL_RELEASE', ?, ?, ?, ?, ?, datetime('now'))
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

export function adjustStockManually(params: {
  packageSizeId: string;
  batchId?: string;
  newAvailableStock: number;
  reason: string;
  userId: string;
}): void {
  runTransaction((db) => {
    const inv = db.prepare(`
      SELECT id, available_stock, reserved_stock, total_stock
      FROM inventory
      WHERE package_size_id = ?
    `).get(params.packageSizeId) as any;

    if (!inv) {
      throw new Error(`Inventory not found for package size ${params.packageSizeId}`);
    }

    const delta = params.newAvailableStock - inv.available_stock;
    const newTotal = inv.total_stock + delta;

    db.prepare(`
      UPDATE inventory
      SET available_stock = ?, total_stock = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(params.newAvailableStock, newTotal, inv.id);

    const txId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO inventory_transactions (
        id, package_size_id, batch_id, transaction_type, quantity, balance_after,
        reason, created_by, created_at
      ) VALUES (?, ?, ?, 'MANUAL_ADJUST', ?, ?, ?, ?, datetime('now'))
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
