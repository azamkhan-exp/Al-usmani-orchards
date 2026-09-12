import { getDatabase, runTransaction } from '../db';
import { ensureDatabaseReady } from '../db/init';
import { recordAuditLog } from './audit.service';
import { verifyStepUpAuth } from './otp.service';

export interface ProductionProtectionSettings {
  enabled: boolean;
  maintenance_mode: boolean;
  retention_days_notifications: number;
  retention_days_sessions: number;
  retention_days_audit_logs: number;
}

const DEFAULT_PROTECTION_SETTINGS: ProductionProtectionSettings = {
  enabled: true,
  maintenance_mode: false,
  retention_days_notifications: 90,
  retention_days_sessions: 30,
  retention_days_audit_logs: 365
};

export interface DatabaseOverview {
  protection: ProductionProtectionSettings;
  counts: {
    orders: {
      total: number;
      production: number;
      demo: number;
      archived: number;
    };
    customers: {
      total: number;
      production: number;
      demo: number;
      archived: number;
    };
    products: {
      total: number;
      active: number;
    };
    inventory: {
      package_sizes: number;
      total_stock_kg: number;
    };
    reviews: {
      total: number;
      production: number;
      demo: number;
    };
    notifications: {
      total: number;
      production: number;
      demo: number;
    };
    audit_logs: {
      total: number;
    };
  };
}

export interface DemoCleanupPreview {
  categories: {
    orders: {
      count: number;
      cascaded: {
        order_items: number;
        payment_transactions: number;
        shipments: number;
        accounts_receivable: number;
      };
    };
    customers: {
      count: number;
      cascaded: {
        addresses: number;
        loyalty_records: number;
        wishlists: number;
      };
    };
    reviews: {
      count: number;
    };
    notifications: {
      count: number;
    };
  };
  total_records_to_delete: number;
}

/**
 * Retrieve production protection configuration from store_settings
 */
export async function getProductionProtectionSettings(): Promise<ProductionProtectionSettings> {
  ensureDatabaseReady();
  const db = getDatabase();
  const row = await db.prepare("SELECT value_json FROM store_settings WHERE key = 'production_protection'").get() as { value_json: string } | undefined;

  if (!row?.value_json) {
    return { ...DEFAULT_PROTECTION_SETTINGS };
  }

  try {
    const parsed = JSON.parse(row.value_json);
    return {
      enabled: parsed.enabled ?? DEFAULT_PROTECTION_SETTINGS.enabled,
      maintenance_mode: parsed.maintenance_mode ?? DEFAULT_PROTECTION_SETTINGS.maintenance_mode,
      retention_days_notifications: Number(parsed.retention_days_notifications) || DEFAULT_PROTECTION_SETTINGS.retention_days_notifications,
      retention_days_sessions: Number(parsed.retention_days_sessions) || DEFAULT_PROTECTION_SETTINGS.retention_days_sessions,
      retention_days_audit_logs: Number(parsed.retention_days_audit_logs) || DEFAULT_PROTECTION_SETTINGS.retention_days_audit_logs
    };
  } catch {
    return { ...DEFAULT_PROTECTION_SETTINGS };
  }
}

/**
 * Toggle or update production protection settings
 */
export async function setProductionProtectionSettings(
  settings: Partial<ProductionProtectionSettings>,
  userId: string,
  userEmail?: string
): Promise<ProductionProtectionSettings> {
  ensureDatabaseReady();
  const current = await getProductionProtectionSettings();
  const updated: ProductionProtectionSettings = {
    ...current,
    ...settings
  };

  const db = getDatabase();
  await db.prepare(`
    INSERT INTO store_settings (id, key, value_json, updated_at)
    VALUES ('set_prod_protection', 'production_protection', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `).run(JSON.stringify(updated));

  await recordAuditLog({
    userId,
    userEmail: userEmail || 'admin@alusmaniorchards.pk',
    action: 'PRODUCTION_PROTECTION_UPDATED',
    resourceType: 'SYSTEM_SETTINGS',
    resourceId: 'production_protection',
    previousState: current,
    newState: updated
  });

  return updated;
}

/**
 * Retrieve full breakdown of database records partitioned by Demo, Production, and Archived
 */
export async function getDatabaseOverview(): Promise<DatabaseOverview> {
  ensureDatabaseReady();
  const db = getDatabase();
  const protection = await getProductionProtectionSettings();

  // Orders
  const orderStats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL) THEN 1 ELSE 0 END) as production,
      SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo,
      SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived
    FROM orders
  `).get() as any;

  // Customers
  const customerStats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL) THEN 1 ELSE 0 END) as production,
      SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo,
      SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived
    FROM customers
  `).get() as any;

  // Products & Package Sizes
  const productStats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active
    FROM products
  `).get() as any;

  const pkgStats = await db.prepare(`
    SELECT
      COUNT(ps.id) as package_sizes,
      COALESCE(SUM(i.available_stock * ps.weight_kg), 0) as total_stock_kg
    FROM package_sizes ps
    LEFT JOIN inventory i ON i.package_size_id = ps.id
  `).get() as any;

  // Customer Reviews
  const reviewStats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (is_demo = 0 OR is_demo IS NULL) THEN 1 ELSE 0 END) as production,
      SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo
    FROM customer_reviews
  `).get() as any;

  // Notifications
  const notifStats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (is_demo = 0 OR is_demo IS NULL) THEN 1 ELSE 0 END) as production,
      SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo
    FROM notification_logs
  `).get() as any;

  // Audit Logs
  const auditStats = await db.prepare(`SELECT COUNT(*) as total FROM admin_audit_logs`).get() as any;

  return {
    protection,
    counts: {
      orders: {
        total: Number(orderStats?.total) || 0,
        production: Number(orderStats?.production) || 0,
        demo: Number(orderStats?.demo) || 0,
        archived: Number(orderStats?.archived) || 0
      },
      customers: {
        total: Number(customerStats?.total) || 0,
        production: Number(customerStats?.production) || 0,
        demo: Number(customerStats?.demo) || 0,
        archived: Number(customerStats?.archived) || 0
      },
      products: {
        total: Number(productStats?.total) || 0,
        active: Number(productStats?.active) || 0
      },
      inventory: {
        package_sizes: Number(pkgStats?.package_sizes) || 0,
        total_stock_kg: Number(pkgStats?.total_stock_kg) || 0
      },
      reviews: {
        total: Number(reviewStats?.total) || 0,
        production: Number(reviewStats?.production) || 0,
        demo: Number(reviewStats?.demo) || 0
      },
      notifications: {
        total: Number(notifStats?.total) || 0,
        production: Number(notifStats?.production) || 0,
        demo: Number(notifStats?.demo) || 0
      },
      audit_logs: {
        total: Number(auditStats?.total) || 0
      }
    }
  };
}

/**
 * Preview impact and child cascade counts before executing demo data cleanup
 */
export async function previewDemoDataCleanup(): Promise<DemoCleanupPreview> {
  ensureDatabaseReady();
  const db = getDatabase();

  // Demo Orders & Children
  const demoOrders = await db.prepare('SELECT id FROM orders WHERE is_demo = 1').all() as Array<{ id: string }>;
  const demoOrderIds = demoOrders.map(o => `'${o.id}'`).join(',');

  let orderItemsCount = 0;
  let paymentTxCount = 0;
  let shipmentsCount = 0;
  let receivablesCount = 0;

  if (demoOrderIds.length > 0) {
    const oi = await db.prepare(`SELECT COUNT(*) as c FROM order_items WHERE order_id IN (${demoOrderIds})`).get() as any;
    orderItemsCount = Number(oi?.c || 0);

    const pt = await db.prepare(`SELECT COUNT(*) as c FROM payment_transactions WHERE order_id IN (${demoOrderIds})`).get() as any;
    paymentTxCount = Number(pt?.c || 0);

    const sh = await db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE order_id IN (${demoOrderIds})`).get() as any;
    shipmentsCount = Number(sh?.c || 0);

    const ar = await db.prepare(`SELECT COUNT(*) as c FROM accounts_receivable WHERE order_id IN (${demoOrderIds})`).get() as any;
    receivablesCount = Number(ar?.c || 0);
  }

  // Demo Customers & Children
  const demoCustomers = await db.prepare('SELECT id FROM customers WHERE is_demo = 1').all() as Array<{ id: string }>;
  const demoCustomerIds = demoCustomers.map(c => `'${c.id}'`).join(',');

  let addressesCount = 0;
  let loyaltyCount = 0;
  let wishlistsCount = 0;

  if (demoCustomerIds.length > 0) {
    const ad = await db.prepare(`SELECT COUNT(*) as c FROM customer_addresses WHERE customer_id IN (${demoCustomerIds})`).get() as any;
    addressesCount = Number(ad?.c || 0);

    const ly = await db.prepare(`SELECT COUNT(*) as c FROM loyalty_accounts WHERE customer_id IN (${demoCustomerIds})`).get() as any;
    loyaltyCount = Number(ly?.c || 0);

    const wl = await db.prepare(`SELECT COUNT(*) as c FROM wishlists WHERE customer_id IN (${demoCustomerIds})`).get() as any;
    wishlistsCount = Number(wl?.c || 0);
  }

  // Demo Reviews & Notifications
  const revCountRow = await db.prepare('SELECT COUNT(*) as c FROM customer_reviews WHERE is_demo = 1').get() as any;
  const revCount = Number(revCountRow?.c || 0);

  const notifCountRow = await db.prepare('SELECT COUNT(*) as c FROM notification_logs WHERE is_demo = 1').get() as any;
  const notifCount = Number(notifCountRow?.c || 0);

  const total = demoOrders.length + orderItemsCount + paymentTxCount + shipmentsCount + receivablesCount +
    demoCustomers.length + addressesCount + loyaltyCount + wishlistsCount + revCount + notifCount;

  return {
    categories: {
      orders: {
        count: demoOrders.length,
        cascaded: {
          order_items: orderItemsCount,
          payment_transactions: paymentTxCount,
          shipments: shipmentsCount,
          accounts_receivable: receivablesCount
        }
      },
      customers: {
        count: demoCustomers.length,
        cascaded: {
          addresses: addressesCount,
          loyalty_records: loyaltyCount,
          wishlists: wishlistsCount
        }
      },
      reviews: {
        count: revCount
      },
      notifications: {
        count: notifCount
      }
    },
    total_records_to_delete: total
  };
}

export interface ExecuteDemoCleanupOptions {
  userId: string;
  userEmail: string;
  password?: string;
  otpCode?: string;
  confirmationPhrase: string;
  categories?: ('ORDERS' | 'CUSTOMERS' | 'REVIEWS' | 'NOTIFICATIONS')[];
}

/**
 * Execute destructive Demo Data Cleanup within an atomic transaction
 * Requires strict validation, phrase matching, password confirmation, and audit logging.
 */
export async function executeDemoDataCleanup(options: ExecuteDemoCleanupOptions): Promise<{
  success: boolean;
  error?: string;
  deleted_counts: Record<string, number>;
}> {
  ensureDatabaseReady();
  const db = getDatabase();
  const protection = await getProductionProtectionSettings();

  // 1. Confirmation phrase validation
  if (options.confirmationPhrase !== 'DELETE DEMO DATA') {
    return {
      success: false,
      error: 'Invalid confirmation phrase. You must type "DELETE DEMO DATA" exactly to proceed.',
      deleted_counts: {}
    };
  }

  // 2. Production Lock check
  if (protection.enabled) {
    return {
      success: false,
      error: 'Production Mode Lock is ENABLED. You must unlock production protection before demo data can be deleted.',
      deleted_counts: {}
    };
  }

  // 3. User verification & Step-Up Auth
  const stepUpResult = await verifyStepUpAuth(options.userId, options.password, options.otpCode);
  if (!stepUpResult.success) {
    return {
      success: false,
      error: stepUpResult.error || 'Administrator re-authentication failed.',
      deleted_counts: {}
    };
  }

  const selectedCategories = options.categories && options.categories.length > 0
    ? options.categories
    : ['ORDERS', 'CUSTOMERS', 'REVIEWS', 'NOTIFICATIONS'];

  const deletedCounts: Record<string, number> = {};

  try {
    await runTransaction(async (txDb) => {
      // 1. Orders cleanup
      if (selectedCategories.includes('ORDERS')) {
        const demoOrders = await txDb.prepare('SELECT id FROM orders WHERE is_demo = 1').all() as Array<{ id: string }>;
        if (demoOrders.length > 0) {
          const ids = demoOrders.map(o => `'${o.id}'`).join(',');
          
          // Delete child rows first
          const delItems = await txDb.prepare(`DELETE FROM order_items WHERE order_id IN (${ids})`).run();
          const delStatus = await txDb.prepare(`DELETE FROM order_status_history WHERE order_id IN (${ids})`).run();
          const delTx = await txDb.prepare(`DELETE FROM payment_transactions WHERE order_id IN (${ids})`).run();
          const delShip = await txDb.prepare(`DELETE FROM shipments WHERE order_id IN (${ids})`).run();
          const delAr = await txDb.prepare(`DELETE FROM accounts_receivable WHERE order_id IN (${ids})`).run();
          const delOrders = await txDb.prepare(`DELETE FROM orders WHERE id IN (${ids})`).run();

          deletedCounts.orders = (delOrders as any).changes;
          deletedCounts.order_items = (delItems as any).changes;
          deletedCounts.order_status_history = (delStatus as any).changes;
          deletedCounts.payment_transactions = (delTx as any).changes;
          deletedCounts.shipments = (delShip as any).changes;
          deletedCounts.accounts_receivable = (delAr as any).changes;
        }
      }

      // 2. Customers cleanup
      if (selectedCategories.includes('CUSTOMERS')) {
        const demoCustomers = await txDb.prepare('SELECT id FROM customers WHERE is_demo = 1').all() as Array<{ id: string }>;
        if (demoCustomers.length > 0) {
          const ids = demoCustomers.map(c => `'${c.id}'`).join(',');

          // Delete children first
          const delAddr = await txDb.prepare(`DELETE FROM customer_addresses WHERE customer_id IN (${ids})`).run();
          const delLedger = await txDb.prepare(`DELETE FROM loyalty_ledger WHERE customer_id IN (${ids})`).run();
          const delLoyalty = await txDb.prepare(`DELETE FROM loyalty_accounts WHERE customer_id IN (${ids})`).run();
          const delWish = await txDb.prepare(`DELETE FROM wishlists WHERE customer_id IN (${ids})`).run();
          const delCust = await txDb.prepare(`DELETE FROM customers WHERE id IN (${ids})`).run();

          deletedCounts.customers = (delCust as any).changes;
          deletedCounts.customer_addresses = (delAddr as any).changes;
          deletedCounts.loyalty_records = (delLedger as any).changes + (delLoyalty as any).changes;
          deletedCounts.wishlists = (delWish as any).changes;
        }
      }

      // 3. Reviews cleanup
      if (selectedCategories.includes('REVIEWS')) {
        const delRev = await txDb.prepare('DELETE FROM customer_reviews WHERE is_demo = 1').run();
        deletedCounts.reviews = (delRev as any).changes;
      }

      // 4. Notifications cleanup
      if (selectedCategories.includes('NOTIFICATIONS')) {
        const delNotif = await txDb.prepare('DELETE FROM notification_logs WHERE is_demo = 1').run();
        deletedCounts.notifications = (delNotif as any).changes;
      }
    });

    // Record audit log
    await recordAuditLog({
      userId: options.userId,
      userEmail: options.userEmail,
      action: 'DEMO_DATA_PURGED',
      resourceType: 'DATABASE',
      resourceId: 'demo_cleanup',
      newState: JSON.stringify({ categories: selectedCategories, deletedCounts })
    });

    return {
      success: true,
      deleted_counts: deletedCounts
    };
  } catch (err: any) {
    console.error('Error during demo data cleanup transaction:', err);
    return {
      success: false,
      error: `Cleanup transaction failed and was rolled back: ${err.message || 'Database error'}`,
      deleted_counts: {}
    };
  }
}

export interface ExecuteProductionLaunchResetOptions {
  userId: string;
  userEmail: string;
  password?: string;
  otpCode?: string;
  confirmationPhrase: string;
}

/**
 * Execute atomic PRODUCTION LAUNCH RESET
 * Cleanses operational test data to leave a pristine store ready for launch.
 */
export async function executeProductionLaunchReset(options: ExecuteProductionLaunchResetOptions): Promise<{
  success: boolean;
  error?: string;
  deleted_counts: Record<string, number>;
}> {
  ensureDatabaseReady();
  const db = getDatabase();
  const protection = await getProductionProtectionSettings();

  // 1. Strict confirmation phrase check
  if (options.confirmationPhrase !== 'RESET PRODUCTION LAUNCH') {
    return {
      success: false,
      error: 'Invalid confirmation phrase. You must type "RESET PRODUCTION LAUNCH" exactly to proceed.',
      deleted_counts: {}
    };
  }

  // 2. Production Lock check
  if (protection.enabled) {
    return {
      success: false,
      error: 'Production Mode Lock is ENABLED. You must unlock production protection before executing a Production Launch Reset.',
      deleted_counts: {}
    };
  }

  // 3. User verification & Step-Up Auth (Password + OTP)
  const stepUpResult = await verifyStepUpAuth(options.userId, options.password, options.otpCode);
  if (!stepUpResult.success) {
    return {
      success: false,
      error: stepUpResult.error || 'Administrator re-authentication failed.',
      deleted_counts: {}
    };
  }

  const deletedCounts: Record<string, number> = {};

  try {
    await runTransaction(async (txDb) => {
      // 1. Demo Orders & Cascading Records
      const demoOrders = await txDb.prepare('SELECT id FROM orders WHERE is_demo = 1').all() as Array<{ id: string }>;
      if (demoOrders.length > 0) {
        const ids = demoOrders.map(o => `'${o.id}'`).join(',');
        const delItems = await txDb.prepare(`DELETE FROM order_items WHERE order_id IN (${ids})`).run();
        const delStatus = await txDb.prepare(`DELETE FROM order_status_history WHERE order_id IN (${ids})`).run();
        const delTx = await txDb.prepare(`DELETE FROM payment_transactions WHERE order_id IN (${ids})`).run();
        const delShip = await txDb.prepare(`DELETE FROM shipments WHERE order_id IN (${ids})`).run();
        const delAr = await txDb.prepare(`DELETE FROM accounts_receivable WHERE order_id IN (${ids})`).run();
        const delOrders = await txDb.prepare(`DELETE FROM orders WHERE id IN (${ids})`).run();

        deletedCounts.orders = (delOrders as any).changes;
        deletedCounts.order_items = (delItems as any).changes;
        deletedCounts.order_status_history = (delStatus as any).changes;
        deletedCounts.payment_transactions = (delTx as any).changes;
        deletedCounts.shipments = (delShip as any).changes;
        deletedCounts.accounts_receivable = (delAr as any).changes;
      } else {
        deletedCounts.orders = 0;
      }

      // 2. Release any orphaned/stale stock reservations
      const delReservations = await txDb.prepare('DELETE FROM stock_reservations').run();
      deletedCounts.stock_reservations_cleared = (delReservations as any).changes;

      // 3. Demo Customers & Cascading Records
      const demoCustomers = await txDb.prepare('SELECT id FROM customers WHERE is_demo = 1').all() as Array<{ id: string }>;
      if (demoCustomers.length > 0) {
        const ids = demoCustomers.map(c => `'${c.id}'`).join(',');
        const delAddr = await txDb.prepare(`DELETE FROM customer_addresses WHERE customer_id IN (${ids})`).run();
        const delLedger = await txDb.prepare(`DELETE FROM loyalty_ledger WHERE customer_id IN (${ids})`).run();
        const delLoyalty = await txDb.prepare(`DELETE FROM loyalty_accounts WHERE customer_id IN (${ids})`).run();
        const delWish = await txDb.prepare(`DELETE FROM wishlists WHERE customer_id IN (${ids})`).run();
        const delCust = await txDb.prepare(`DELETE FROM customers WHERE id IN (${ids})`).run();

        deletedCounts.customers = (delCust as any).changes;
        deletedCounts.customer_addresses = (delAddr as any).changes;
        deletedCounts.loyalty_records = (delLedger as any).changes + (delLoyalty as any).changes;
        deletedCounts.wishlists = (delWish as any).changes;
      } else {
        deletedCounts.customers = 0;
      }

      // 4. Demo Reviews
      const delRev = await txDb.prepare('DELETE FROM customer_reviews WHERE is_demo = 1').run();
      deletedCounts.reviews = (delRev as any).changes;

      // 5. Demo Notifications
      const delNotif = await txDb.prepare('DELETE FROM notification_logs WHERE is_demo = 1').run();
      deletedCounts.notifications = (delNotif as any).changes;

      // 6. Expired Sessions Cleanup
      const delSess = await txDb.prepare("DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP").run();
      deletedCounts.expired_sessions = (delSess as any).changes;
    });

    // Record audit log
    await recordAuditLog({
      userId: options.userId,
      userEmail: options.userEmail,
      action: 'PRODUCTION_LAUNCH_RESET',
      resourceType: 'DATABASE',
      resourceId: 'launch_reset',
      newState: JSON.stringify({ deletedCounts, executedAt: new Date().toISOString() })
    });

    return {
      success: true,
      deleted_counts: deletedCounts
    };
  } catch (err: any) {
    console.error('Error during production launch reset transaction:', err);
    return {
      success: false,
      error: `Production launch reset failed and was rolled back: ${err.message || 'Database error'}`,
      deleted_counts: {}
    };
  }
}

/**
 * Archive an order (soft-exclusion from active views and active revenue metrics)
 */
export async function archiveOrder(orderId: string, userId: string, userEmail?: string): Promise<boolean> {
  ensureDatabaseReady();
  const db = getDatabase();

  const res = await db.prepare(`
    UPDATE orders 
    SET is_archived = 1, archived_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(orderId);

  if ((res as any).changes > 0) {
    await recordAuditLog({
      userId,
      userEmail: userEmail || 'admin@alusmaniorchards.pk',
      action: 'ORDER_ARCHIVED',
      resourceType: 'ORDER',
      resourceId: orderId,
      newState: JSON.stringify({ is_archived: 1 })
    });
    return true;
  }
  return false;
}

/**
 * Restore an archived order back to active state
 */
export async function restoreOrder(orderId: string, userId: string, userEmail?: string): Promise<boolean> {
  ensureDatabaseReady();
  const db = getDatabase();

  const res = await db.prepare(`
    UPDATE orders 
    SET is_archived = 0, archived_at = NULL
    WHERE id = ?
  `).run(orderId);

  if ((res as any).changes > 0) {
    await recordAuditLog({
      userId,
      userEmail: userEmail || 'admin@alusmaniorchards.pk',
      action: 'ORDER_RESTORED',
      resourceType: 'ORDER',
      resourceId: orderId,
      newState: JSON.stringify({ is_archived: 0 })
    });
    return true;
  }
  return false;
}

/**
 * Clean up expired user sessions and aged logs according to data retention policies
 */
export async function executeDataRetentionCleanup(): Promise<{ expired_sessions: number; aged_notifications: number }> {
  ensureDatabaseReady();
  const db = getDatabase();
  const protection = await getProductionProtectionSettings();

  const sessDays = Number(protection.retention_days_sessions || 30);
  const notifDays = Number(protection.retention_days_notifications || 90);

  const delSessions = await db.prepare(`
    DELETE FROM user_sessions 
    WHERE expires_at < (NOW() - (? || ' days')::interval)
  `).run(sessDays);

  const delNotifs = await db.prepare(`
    DELETE FROM notification_logs 
    WHERE created_at < (NOW() - (? || ' days')::interval)
      AND order_id IS NULL
  `).run(notifDays);

  return {
    expired_sessions: (delSessions as any).changes,
    aged_notifications: (delNotifs as any).changes
  };
}
