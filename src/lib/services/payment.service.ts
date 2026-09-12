import { getDatabase } from '@/lib/db';
import { recordAuditLog } from './audit.service';

export interface PaymentMethodConfig {
  config_key: string;
  config_value: string;
  is_secret: number;
}

export interface PaymentMethodEntity {
  id: string;
  code: string;
  name: string;
  description: string;
  is_enabled: number;
  type: string;
  display_order: number;
  configs?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ProductPaymentOverride {
  id: string;
  product_id: string;
  payment_method_code: string;
  status: 'INHERIT' | 'ENABLED' | 'DISABLED';
}

export interface PaymentTransactionRecord {
  id: string;
  order_id: string;
  payment_method_code: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'AWAITING_VERIFICATION' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  transaction_reference?: string | null;
  payment_proof_url?: string | null;
  gateway_provider?: string | null;
  gateway_response_json?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
}

/**
 * Returns all payment methods with configuration key-values.
 */
export function getAllPaymentMethods(includeSecrets = false): PaymentMethodEntity[] {
  const db = getDatabase();
  const methods = db.prepare(`
    SELECT id, code, name, description, is_enabled, type, display_order, created_at, updated_at
    FROM payment_methods
    ORDER BY display_order ASC
  `).all() as PaymentMethodEntity[];

  const configsStmt = db.prepare(`
    SELECT config_key, config_value, is_secret
    FROM payment_method_configs
    WHERE payment_method_id = ?
  `);

  for (const method of methods) {
    const rawConfigs = configsStmt.all(method.id) as PaymentMethodConfig[];
    const configMap: Record<string, string> = {};

    for (const cfg of rawConfigs) {
      if (cfg.is_secret && !includeSecrets && cfg.config_value) {
        configMap[cfg.config_key] = '••••••••••••';
      } else {
        configMap[cfg.config_key] = cfg.config_value;
      }
    }
    method.configs = configMap;
  }

  return methods;
}

/**
 * Returns a single payment method by code.
 */
export function getPaymentMethodByCode(code: string, includeSecrets = false): PaymentMethodEntity | null {
  const db = getDatabase();
  const method = db.prepare(`
    SELECT id, code, name, description, is_enabled, type, display_order, created_at, updated_at
    FROM payment_methods
    WHERE UPPER(code) = UPPER(?)
  `).get(code) as PaymentMethodEntity | undefined;

  if (!method) return null;

  const rawConfigs = db.prepare(`
    SELECT config_key, config_value, is_secret
    FROM payment_method_configs
    WHERE payment_method_id = ?
  `).all(method.id) as PaymentMethodConfig[];

  const configMap: Record<string, string> = {};
  for (const cfg of rawConfigs) {
    if (cfg.is_secret && !includeSecrets && cfg.config_value) {
      configMap[cfg.config_key] = '••••••••••••';
    } else {
      configMap[cfg.config_key] = cfg.config_value;
    }
  }
  method.configs = configMap;

  return method;
}

/**
 * Updates global status and configuration parameters for a payment method.
 */
export function updatePaymentMethod(
  code: string,
  isEnabled: boolean,
  configs?: Record<string, string>,
  adminUserId?: string
): boolean {
  const db = getDatabase();
  const method = db.prepare('SELECT id, is_enabled FROM payment_methods WHERE UPPER(code) = UPPER(?)').get(code) as any;
  if (!method) return false;

  db.prepare(`
    UPDATE payment_methods
    SET is_enabled = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(isEnabled ? 1 : 0, method.id);

  if (configs) {
    const upsertConfig = db.prepare(`
      INSERT INTO payment_method_configs (id, payment_method_id, config_key, config_value, is_secret, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(payment_method_id, config_key) DO UPDATE SET
        config_value = excluded.config_value,
        updated_at = datetime('now')
    `);

    for (const [key, val] of Object.entries(configs)) {
      // Don't overwrite secret with masked placeholder
      if (val === '••••••••••••') continue;

      const isSecretKey = key.includes('secret') || key.includes('key') && key !== 'publishable_key';
      const id = `cfg_${code.toLowerCase()}_${key}`;
      upsertConfig.run(id, method.id, key, val, isSecretKey ? 1 : 0);
    }
  }

  if (adminUserId) {
    recordAuditLog({
      userId: adminUserId,
      action: 'PAYMENT_METHOD_UPDATED',
      resourceType: 'PAYMENT',
      resourceId: code,
      newState: JSON.stringify({ is_enabled: isEnabled, updated_configs: configs ? Object.keys(configs) : [] })
    });
  }

  return true;
}

/**
 * Retrieves per-product payment method overrides.
 */
export function getProductPaymentOverrides(productId: string): ProductPaymentOverride[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT id, product_id, payment_method_code, status
    FROM product_payment_methods
    WHERE product_id = ?
  `).all(productId) as ProductPaymentOverride[];
}

/**
 * Sets product payment method override (INHERIT, ENABLED, DISABLED).
 */
export function setProductPaymentOverride(
  productId: string,
  methodCode: string,
  status: 'INHERIT' | 'ENABLED' | 'DISABLED'
): void {
  const db = getDatabase();
  const upperCode = methodCode.toUpperCase();
  const id = `ppm_${productId}_${upperCode}`;

  db.prepare(`
    INSERT INTO product_payment_methods (id, product_id, payment_method_code, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(product_id, payment_method_code) DO UPDATE SET
      status = excluded.status,
      updated_at = datetime('now')
  `).run(id, productId, upperCode, status);
}

/**
 * AUTHORITATIVE PAYMENT METHOD RESOLUTION RULE:
 * 1. If a payment method is globally disabled (is_enabled = 0), it is NEVER available.
 * 2. If globally enabled:
 *    - For single or multi-item carts, a method is available if and only if
 *      NONE of the items explicitly set status = 'DISABLED'.
 *    - In other words: If ANY product in the cart disallows the method, it is disallowed for the entire cart.
 */
export function determineAvailablePaymentMethods(productIds: string[] = []): PaymentMethodEntity[] {
  const db = getDatabase();

  // 1. Get all globally enabled methods
  const globalMethods = getAllPaymentMethods(false).filter(m => m.is_enabled === 1);

  if (productIds.length === 0) {
    return globalMethods;
  }

  // 2. Fetch overrides for all products in the cart
  const placeholders = productIds.map(() => '?').join(',');
  const overrides = db.prepare(`
    SELECT product_id, payment_method_code, status
    FROM product_payment_methods
    WHERE product_id IN (${placeholders})
  `).all(...productIds) as ProductPaymentOverride[];

  // Map: methodCode -> Set of statuses for cart items
  const overrideMap: Record<string, Set<'INHERIT' | 'ENABLED' | 'DISABLED'>> = {};
  for (const o of overrides) {
    const code = o.payment_method_code.toUpperCase();
    if (!overrideMap[code]) {
      overrideMap[code] = new Set();
    }
    overrideMap[code].add(o.status);
  }

  // 3. Filter methods: If ANY product has DISABLED, filter it out
  return globalMethods.filter(method => {
    const statuses = overrideMap[method.code.toUpperCase()];
    if (!statuses) {
      // All items inherit global enabled
      return true;
    }
    // Mixed cart rule: If ANY item explicitly disables this method, disallow for entire cart
    if (statuses.has('DISABLED')) {
      return false;
    }
    return true;
  });
}

/**
 * Records a payment transaction ledger entry.
 */
export function recordPaymentTransaction(
  orderId: string,
  methodCode: string,
  amount: number,
  options?: {
    transaction_reference?: string;
    payment_proof_url?: string;
    gateway_provider?: string;
    gateway_response?: any;
    status?: 'PENDING' | 'AWAITING_VERIFICATION' | 'PROCESSING' | 'PAID';
  }
): string {
  const db = getDatabase();
  const id = `ptx_${crypto.randomUUID()}`;
  const codeUpper = methodCode.toUpperCase();

  let initialStatus = options?.status;
  if (!initialStatus) {
    if (codeUpper === 'EASYPAISA' || codeUpper === 'JAZZCASH') {
      initialStatus = 'AWAITING_VERIFICATION';
    } else if (codeUpper === 'COD') {
      initialStatus = 'PENDING';
    } else {
      initialStatus = 'PENDING';
    }
  }

  db.prepare(`
    INSERT INTO payment_transactions (
      id, order_id, payment_method_code, amount, currency, status,
      transaction_reference, payment_proof_url, gateway_provider,
      gateway_response_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'PKR', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    orderId,
    codeUpper,
    amount,
    initialStatus,
    options?.transaction_reference || null,
    options?.payment_proof_url || null,
    options?.gateway_provider || null,
    options?.gateway_response ? JSON.stringify(options.gateway_response) : null
  );

  return id;
}

/**
 * Retrieves all manual transactions awaiting admin verification.
 */
export function getPendingVerificationPayments(): PaymentTransactionRecord[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT pt.*, o.order_number, o.customer_id, COALESCE(c.full_name, o.guest_name) as customer_name, COALESCE(c.phone, o.guest_phone) as customer_phone
    FROM payment_transactions pt
    JOIN orders o ON o.id = pt.order_id
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE pt.status = 'AWAITING_VERIFICATION'
    ORDER BY pt.created_at DESC
  `).all() as PaymentTransactionRecord[];
}

/**
 * Admin action: Verifies or rejects a manual payment proof / TID.
 */
export function verifyManualPayment(
  transactionId: string,
  adminUserId: string,
  approved: boolean,
  adminNotes?: string
): boolean {
  const db = getDatabase();
  const tx = db.prepare(`
    SELECT pt.*, o.id as order_id, o.order_number
    FROM payment_transactions pt
    JOIN orders o ON o.id = pt.order_id
    WHERE pt.id = ?
  `).get(transactionId) as any;

  if (!tx) return false;

  const newStatus = approved ? 'PAID' : 'FAILED';
  const orderPaymentStatus = approved ? 'PAID' : 'FAILED';

  // Update payment transaction
  db.prepare(`
    UPDATE payment_transactions
    SET status = ?,
        verified_by = ?,
        verified_at = datetime('now'),
        admin_notes = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(newStatus, adminUserId, adminNotes || null, transactionId);

  // Update order payment status
  db.prepare(`
    UPDATE orders
    SET payment_status = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(orderPaymentStatus, tx.order_id);

  recordAuditLog({
    userId: adminUserId,
    action: approved ? 'PAYMENT_VERIFIED_SUCCESS' : 'PAYMENT_VERIFIED_REJECTED',
    resourceType: 'PAYMENT_TRANSACTION',
    resourceId: transactionId,
    newState: JSON.stringify({
      order_id: tx.order_id,
      order_number: tx.order_number,
      status: newStatus,
      notes: adminNotes
    })
  });

  return true;
}
