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
 * Retrieve production protection configuration from SQLite store_settings
 */
export function getProductionProtectionSettings(): ProductionProtectionSettings {
  ensureDatabaseReady();
  const db = getDatabase();
  const row = db.prepare("SELECT value_json FROM store_settings WHERE key = 'production_protection'").get() as { value_json: string } | undefined;

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
export function setProductionProtectionSettings(
  settings: Partial<ProductionProtectionSettings>,
  userId: string,
  userEmail?: string
): ProductionProtectionSettings {
  ensureDatabaseReady();
  const current = getProductionProtectionSettings();
  const updated: ProductionProtectionSettings = {
    ...current,
    ...settings
  };

  const db = getDatabase();
  db.prepare(`
    INSERT INTO store_settings (id, key, value_json, updated_at)
    VALUES ('set_prod_protection', 'production_protection', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `).run(JSON.stringify(updated));

  recordAuditLog({
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
export function getDatabaseOverview(): DatabaseOverview {
  ensureDatabaseReady();
  const db = getDatabase();
  const protection = getProductionProtectionSettings();

  // Orders
  const orderStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL) THEN 1 ELSE 0 END) as production,
      SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo,
      SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived
    FROM orders
  `).get() as any;

  // Customers
  const customerStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (is_demo = 0 OR is_demo IS NULL) AND (is_archived = 0 OR is_archived IS NULL) THEN 1 ELSE 0 END) as production,
      SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo,
      SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived
    FROM customers
  `).get() as any;

  // Products & Package Sizes
  const productStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active
    FROM products
  `).get() as any;

  const pkgStats = db.prepare(`
    SELECT
      COUNT(*) as package_sizes,
      COALESCE(SUM(current_stock * weight_kg), 0) as total_stock_kg
    FROM package_sizes
  `).get() as any;

  // Customer Reviews
  const reviewStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (is_demo = 0 OR is_demo IS NULL) THEN 1 ELSE 0 END) as production,
      SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo
    FROM customer_reviews
  `).get() as any;

  // Notifications
  const notifStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (is_demo = 0 OR is_demo IS NULL) THEN 1 ELSE 0 END) as production,
      SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo
    FROM notification_logs
  `).get() as any;

  // Audit Logs
  const auditStats = db.prepare(`SELECT COUNT(*) as total FROM admin_audit_logs`).get() as any;

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
export function previewDemoDataCleanup(): DemoCleanupPreview {
  ensureDatabaseReady();
  const db = getDatabase();

  // Demo Orders & Children
  const demoOrders = db.prepare('SELECT id FROM orders WHERE is_demo = 1').all() as Array<{ id: string }>;
  const demoOrderIds = demoOrders.map(o => `'${o.id}'`).join(',');

  let orderItemsCount = 0;
  let paymentTxCount = 0;
  let shipmentsCount = 0;
  let receivablesCount = 0;

  if (demoOrderIds.length > 0) {
    const oi = db.prepare(`SELECT COUNT(*) as c FROM order_items WHERE order_id IN (${demoOrderIds})`).get() as any;
    orderItemsCount = oi?.c || 0;

    const pt = db.prepare(`SELECT COUNT(*) as c FROM payment_transactions WHERE order_id IN (${demoOrderIds})`).get() as any;
    paymentTxCount = pt?.c || 0;

    const sh = db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE order_id IN (${demoOrderIds})`).get() as any;
    shipmentsCount = sh?.c || 0;

    const ar = db.prepare(`SELECT COUNT(*) as c FROM accounts_receivable WHERE order_id IN (${demoOrderIds})`).get() as any;
    receivablesCount = ar?.c || 0;
  }

  // Demo Customers & Children
  const demoCustomers = db.prepare('SELECT id FROM customers WHERE is_demo = 1').all() as Array<{ id: string }>;
  const demoCustomerIds = demoCustomers.map(c => `'${c.id}'`).join(',');

  let addressesCount = 0;
  let loyaltyCount = 0;
  let wishlistsCount = 0;

  if (demoCustomerIds.length > 0) {
    const ad = db.prepare(`SELECT COUNT(*) as c FROM customer_addresses WHERE customer_id IN (${demoCustomerIds})`).get() as any;
    addressesCount = ad?.c || 0;

    const ly = db.prepare(`SELECT COUNT(*) as c FROM loyalty_accounts WHERE customer_id IN (${demoCustomerIds})`).get() as any;
    loyaltyCount = ly?.c || 0;

    const wl = db.prepare(`SELECT COUNT(*) as c FROM wishlists WHERE customer_id IN (${demoCustomerIds})`).get() as any;
    wishlistsCount = wl?.c || 0;
  }

  // Demo Reviews & Notifications
  const revCount = (db.prepare('SELECT COUNT(*) as c FROM customer_reviews WHERE is_demo = 1').get() as any)?.c || 0;
  const notifCount = (db.prepare('SELECT COUNT(*) as c FROM notification_logs WHERE is_demo = 1').get() as any)?.c || 0;

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
 * Execute destructive Demo Data Cleanup within an atomic SQLite transaction
 * Requires strict validation, phrase matching, password confirmation, and audit logging.
 */
export function executeDemoDataCleanup(options: ExecuteDemoCleanupOptions): {
  success: boolean;
  error?: string;
  deleted_counts: Record<string, number>;
} {
  ensureDatabaseReady();
  const db = getDatabase();
  const protection = getProductionProtectionSettings();

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
  const stepUpResult = verifyStepUpAuth(options.userId, options.password, options.otpCode);
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
    runTransaction((txDb) => {
      // 1. Orders cleanup
      if (selectedCategories.includes('ORDERS')) {
        const demoOrders = txDb.prepare('SELECT id FROM orders WHERE is_demo = 1').all() as Array<{ id: string }>;
        if (demoOrders.length > 0) {
          const ids = demoOrders.map(o => `'${o.id}'`).join(',');
          
          // Delete child rows first
          const delItems = txDb.prepare(`DELETE FROM order_items WHERE order_id IN (${ids})`).run();
          const delStatus = txDb.prepare(`DELETE FROM order_status_history WHERE order_id IN (${ids})`).run();
          const delTx = txDb.prepare(`DELETE FROM payment_transactions WHERE order_id IN (${ids})`).run();
          const delShip = txDb.prepare(`DELETE FROM shipments WHERE order_id IN (${ids})`).run();
          const delAr = txDb.prepare(`DELETE FROM accounts_receivable WHERE order_id IN (${ids})`).run();
          const delOrders = txDb.prepare(`DELETE FROM orders WHERE id IN (${ids})`).run();

          deletedCounts.orders = delOrders.changes;
          deletedCounts.order_items = delItems.changes;
          deletedCounts.order_status_history = delStatus.changes;
          deletedCounts.payment_transactions = delTx.changes;
          deletedCounts.shipments = delShip.changes;
          deletedCounts.accounts_receivable = delAr.changes;
        }
      }

      // 2. Customers cleanup
      if (selectedCategories.includes('CUSTOMERS')) {
        const demoCustomers = txDb.prepare('SELECT id FROM customers WHERE is_demo = 1').all() as Array<{ id: string }>;
        if (demoCustomers.length > 0) {
          const ids = demoCustomers.map(c => `'${c.id}'`).join(',');

          // Delete children first
          const delAddr = txDb.prepare(`DELETE FROM customer_addresses WHERE customer_id IN (${ids})`).run();
          const delLedger = txDb.prepare(`DELETE FROM loyalty_ledger WHERE customer_id IN (${ids})`).run();
          const delLoyalty = txDb.prepare(`DELETE FROM loyalty_accounts WHERE customer_id IN (${ids})`).run();
          const delWish = txDb.prepare(`DELETE FROM wishlists WHERE customer_id IN (${ids})`).run();
          const delCust = txDb.prepare(`DELETE FROM customers WHERE id IN (${ids})`).run();

          deletedCounts.customers = delCust.changes;
          deletedCounts.customer_addresses = delAddr.changes;
          deletedCounts.loyalty_records = delLedger.changes + delLoyalty.changes;
          deletedCounts.wishlists = delWish.changes;
        }
      }

      // 3. Reviews cleanup
      if (selectedCategories.includes('REVIEWS')) {
        const delRev = txDb.prepare('DELETE FROM customer_reviews WHERE is_demo = 1').run();
        deletedCounts.reviews = delRev.changes;
      }

      // 4. Notifications cleanup
      if (selectedCategories.includes('NOTIFICATIONS')) {
        const delNotif = txDb.prepare('DELETE FROM notification_logs WHERE is_demo = 1').run();
        deletedCounts.notifications = delNotif.changes;
      }
    });

    // Record audit log
    recordAuditLog({
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
 * Cleanses operational test data (demo orders, test customers, transient stock reservations, test notifications)
 * to leave a pristine store ready for day 1 launch, while STRICTLY PROTECTING:
 * - Administrator accounts & sessions
 * - Products, categories & package sizes
 * - Physical inventory assets
 * - Pakistan delivery locations & courier fees
 * - Payment configuration & Store settings
 * - WhatsApp settings & notification templates
 * - Feature flags & AI knowledge base
 */
export function executeProductionLaunchReset(options: ExecuteProductionLaunchResetOptions): {
  success: boolean;
  error?: string;
  deleted_counts: Record<string, number>;
} {
  ensureDatabaseReady();
  const db = getDatabase();
  const protection = getProductionProtectionSettings();

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
  const stepUpResult = verifyStepUpAuth(options.userId, options.password, options.otpCode);
  if (!stepUpResult.success) {
    return {
      success: false,
      error: stepUpResult.error || 'Administrator re-authentication failed.',
      deleted_counts: {}
    };
  }

  const deletedCounts: Record<string, number> = {};

  try {
    runTransaction((txDb) => {
      // 1. Demo Orders & Cascading Records
      const demoOrders = txDb.prepare('SELECT id FROM orders WHERE is_demo = 1').all() as Array<{ id: string }>;
      if (demoOrders.length > 0) {
        const ids = demoOrders.map(o => `'${o.id}'`).join(',');
        const delItems = txDb.prepare(`DELETE FROM order_items WHERE order_id IN (${ids})`).run();
        const delStatus = txDb.prepare(`DELETE FROM order_status_history WHERE order_id IN (${ids})`).run();
        const delTx = txDb.prepare(`DELETE FROM payment_transactions WHERE order_id IN (${ids})`).run();
        const delShip = txDb.prepare(`DELETE FROM shipments WHERE order_id IN (${ids})`).run();
        const delAr = txDb.prepare(`DELETE FROM accounts_receivable WHERE order_id IN (${ids})`).run();
        const delOrders = txDb.prepare(`DELETE FROM orders WHERE id IN (${ids})`).run();

        deletedCounts.orders = delOrders.changes;
        deletedCounts.order_items = delItems.changes;
        deletedCounts.order_status_history = delStatus.changes;
        deletedCounts.payment_transactions = delTx.changes;
        deletedCounts.shipments = delShip.changes;
        deletedCounts.accounts_receivable = delAr.changes;
      } else {
        deletedCounts.orders = 0;
      }

      // 2. Release any orphaned/stale stock reservations
      const delReservations = txDb.prepare('DELETE FROM stock_reservations').run();
      deletedCounts.stock_reservations_cleared = delReservations.changes;

      // 3. Demo Customers & Cascading Records
      const demoCustomers = txDb.prepare('SELECT id FROM customers WHERE is_demo = 1').all() as Array<{ id: string }>;
      if (demoCustomers.length > 0) {
        const ids = demoCustomers.map(c => `'${c.id}'`).join(',');
        const delAddr = txDb.prepare(`DELETE FROM customer_addresses WHERE customer_id IN (${ids})`).run();
        const delLedger = txDb.prepare(`DELETE FROM loyalty_ledger WHERE customer_id IN (${ids})`).run();
        const delLoyalty = txDb.prepare(`DELETE FROM loyalty_accounts WHERE customer_id IN (${ids})`).run();
        const delWish = txDb.prepare(`DELETE FROM wishlists WHERE customer_id IN (${ids})`).run();
        const delCust = txDb.prepare(`DELETE FROM customers WHERE id IN (${ids})`).run();

        deletedCounts.customers = delCust.changes;
        deletedCounts.customer_addresses = delAddr.changes;
        deletedCounts.loyalty_records = delLedger.changes + delLoyalty.changes;
        deletedCounts.wishlists = delWish.changes;
      } else {
        deletedCounts.customers = 0;
      }

      // 4. Demo Reviews
      const delRev = txDb.prepare('DELETE FROM customer_reviews WHERE is_demo = 1').run();
      deletedCounts.reviews = delRev.changes;

      // 5. Demo Notifications
      const delNotif = txDb.prepare('DELETE FROM notification_logs WHERE is_demo = 1').run();
      deletedCounts.notifications = delNotif.changes;

      // 6. Expired Sessions Cleanup
      const delSess = txDb.prepare("DELETE FROM user_sessions WHERE expires_at < datetime('now')").run();
      deletedCounts.expired_sessions = delSess.changes;
    });

    // Record audit log
    recordAuditLog({
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
export function archiveOrder(orderId: string, userId: string, userEmail?: string): boolean {
  ensureDatabaseReady();
  const db = getDatabase();

  const res = db.prepare(`
    UPDATE orders 
    SET is_archived = 1, archived_at = datetime('now')
    WHERE id = ?
  `).run(orderId);

  if (res.changes > 0) {
    recordAuditLog({
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
export function restoreOrder(orderId: string, userId: string, userEmail?: string): boolean {
  ensureDatabaseReady();
  const db = getDatabase();

  const res = db.prepare(`
    UPDATE orders 
    SET is_archived = 0, archived_at = NULL
    WHERE id = ?
  `).run(orderId);

  if (res.changes > 0) {
    recordAuditLog({
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
export function executeDataRetentionCleanup(): { expired_sessions: number; aged_notifications: number } {
  ensureDatabaseReady();
  const db = getDatabase();
  const protection = getProductionProtectionSettings();

  const sessDays = protection.retention_days_sessions || 30;
  const notifDays = protection.retention_days_notifications || 90;

  const delSessions = db.prepare(`
    DELETE FROM user_sessions 
    WHERE expires_at < datetime('now', '-' || ? || ' days')
  `).run(sessDays);

  const delNotifs = db.prepare(`
    DELETE FROM notification_logs 
    WHERE created_at < datetime('now', '-' || ? || ' days')
      AND order_id IS NULL
  `).run(notifDays);

  return {
    expired_sessions: delSessions.changes,
    aged_notifications: delNotifs.changes
  };
}
