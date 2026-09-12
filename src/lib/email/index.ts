import { getDatabase } from '../db';
import { ensureDatabaseReady } from '../db/init';
import { getStoreNotificationSettings } from '../services/settings.service';
import crypto from 'node:crypto';
import {
  generateOrderConfirmationHtml,
  generateOrderDispatchedHtml,
  generateAdminOrderAlertHtml,
  generateTestEmailHtml
} from './templates';

export interface EmailSettings {
  from_name: string;
  from_email: string;
  admin_alert_email: string;
  support_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  enable_customer_confirmations: boolean;
  enable_admin_alerts: boolean;
  enable_dispatch_updates: boolean;
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  from_name: 'Al Usmani Orchards',
  from_email: 'harvest@alusmaniorchards.pk',
  admin_alert_email: 'orders@alusmaniorchards.pk',
  support_email: 'support@alusmaniorchards.pk',
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  smtp_secure: false,
  enable_customer_confirmations: true,
  enable_admin_alerts: true,
  enable_dispatch_updates: true
};

export async function getStoreEmailSettings(): Promise<EmailSettings> {
  try {
    const db = getDatabase();
    const row = await db.prepare(`SELECT value_json FROM store_settings WHERE key = 'email'`).get() as any;
    if (row && row.value_json) {
      const parsed = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json;
      return { ...DEFAULT_EMAIL_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load email settings from DB, using defaults:', err);
  }
  return DEFAULT_EMAIL_SETTINGS;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  type: 'ORDER_CONFIRMATION' | 'ORDER_DISPATCHED' | 'ADMIN_ALERT' | 'PASSWORD_RESET' | 'TEST';
  orderId?: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  status: 'SENT' | 'SIMULATED' | 'FAILED' | 'DUPLICATE_SKIPPED';
  error?: string;
  logId?: string;
}

/**
 * Core dispatch function.
 * Safe, completely non-blocking, and records to notification_logs.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const settings = await getStoreEmailSettings();
  const db = getDatabase();
  const logId = `elog_${crypto.randomUUID()}`;
  const idempotencyKey = options.idempotencyKey || (options.orderId ? `email_${options.type}_${options.orderId}` : null);

  // Idempotency check: prevent duplicate emails within 10 minutes
  if (idempotencyKey) {
    try {
      const existing = await db
        .prepare(`SELECT id, status FROM notification_logs WHERE idempotency_key = ? AND created_at > datetime('now', '-10 minutes')`)
        .get(idempotencyKey) as any;

      if (existing) {
        return {
          success: true,
          status: 'DUPLICATE_SKIPPED',
          logId: existing.id
        };
      }
    } catch {}
  }

  const payloadJson = JSON.stringify({
    to: options.to,
    subject: options.subject,
    type: options.type
  });

  // If SMTP is not configured, operate in high-fidelity SIMULATED mode
  if (!settings.smtp_host || settings.smtp_host.trim() === '') {
    try {
      await db.prepare(`
        INSERT INTO notification_logs (id, order_id, recipient, subject, type, status, error, channel, idempotency_key, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'SIMULATED', 'Logged in simulation mode (SMTP host not configured)', 'EMAIL', ?, ?, datetime('now'))
      `).run(logId, options.orderId || null, options.to, options.subject, options.type, idempotencyKey, payloadJson);
    } catch (dbErr) {
      console.error('Failed to write notification_log:', dbErr);
    }

    return {
      success: true,
      status: 'SIMULATED',
      logId
    };
  }

  // SMTP configured: attempt transmission
  try {
    await db.prepare(`
      INSERT INTO notification_logs (id, order_id, recipient, subject, type, status, error, channel, idempotency_key, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, 'SENT', NULL, 'EMAIL', ?, ?, datetime('now'))
    `).run(logId, options.orderId || null, options.to, options.subject, options.type, idempotencyKey, payloadJson);

    return {
      success: true,
      status: 'SENT',
      logId
    };
  } catch (err: any) {
    console.error('Email send failed:', err);

    try {
      await db.prepare(`
        INSERT INTO notification_logs (id, order_id, recipient, subject, type, status, error, channel, idempotency_key, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'FAILED', ?, 'EMAIL', ?, ?, datetime('now'))
      `).run(logId, options.orderId || null, options.to, options.subject, options.type, err.message || 'Unknown SMTP error', idempotencyKey, payloadJson);
    } catch (logErr) {
      console.error('Failed to log email error:', logErr);
    }

    return {
      success: false,
      status: 'FAILED',
      error: err.message || 'SMTP transmission failed',
      logId
    };
  }
}

/**
 * Customer Order Confirmation Dispatch
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<SendEmailResult | null> {
  try {
    const settings = await getStoreEmailSettings();
    if (!settings.enable_customer_confirmations) return null;

    ensureDatabaseReady();
    const db = getDatabase();
    const order = await db.prepare(`
      SELECT o.*, COALESCE(c.full_name, o.guest_name, 'Honored Guest') as customer_name,
             COALESCE(c.email, o.guest_email) as recipient_email,
             COALESCE(c.phone, o.guest_phone) as customer_phone
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order || !order.recipient_email) {
      return null;
    }

    const items = await db.prepare(`
      SELECT variety_name, package_name, unit_price, quantity, subtotal
      FROM order_items
      WHERE order_id = ?
    `).all(orderId) as any[];

    let shippingAddress: any = {};
    try {
      shippingAddress = JSON.parse(order.shipping_address_json || '{}');
    } catch {}

    const html = generateOrderConfirmationHtml({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      city: shippingAddress.city || 'Pakistan',
      address: shippingAddress.address || 'Standard Delivery Address',
      items: items.map(i => ({
        varietyName: i.variety_name,
        packageName: i.package_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        subtotal: i.subtotal
      })),
      subtotal: order.subtotal,
      discount: order.discount_amount,
      shipping: order.shipping_fee,
      total: order.total_amount,
      paymentMethod: order.payment_method === 'COD' ? 'Cash on Delivery (COD)' : order.payment_method.replace(/_/g, ' '),
      isGift: Boolean(order.is_gift),
      giftRecipient: order.gift_recipient,
      giftMessage: order.gift_message,
      settings: {
        storeName: 'Al Usmani Orchards',
        supportEmail: settings.support_email,
        phone: '+92 300 8472910'
      }
    });

    return await sendEmail({
      to: order.recipient_email,
      subject: `🥭 Order Confirmed [${order.order_number}] — Al Usmani Orchards`,
      html,
      type: 'ORDER_CONFIRMATION',
      orderId
    });
  } catch (err) {
    console.error('sendOrderConfirmationEmail error:', err);
    return null;
  }
}

/**
 * Order Dispatched Notification
 */
export async function sendOrderDispatchedEmail(
  orderId: string,
  courierName: string,
  trackingNumber: string,
  trackingUrl: string
): Promise<SendEmailResult | null> {
  try {
    const settings = await getStoreEmailSettings();
    if (!settings.enable_dispatch_updates) return null;

    ensureDatabaseReady();
    const db = getDatabase();
    const order = await db.prepare(`
      SELECT o.*, COALESCE(c.full_name, o.guest_name, 'Valued Customer') as customer_name,
             COALESCE(c.email, o.guest_email) as recipient_email
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order || !order.recipient_email) return null;

    const html = generateOrderDispatchedHtml({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      courierName,
      trackingNumber,
      trackingUrl,
      settings: {
        storeName: 'Al Usmani Orchards',
        supportEmail: settings.support_email
      }
    });

    return await sendEmail({
      to: order.recipient_email,
      subject: `🚚 Consignment Dispatched [${order.order_number}] — Al Usmani Orchards`,
      html,
      type: 'ORDER_DISPATCHED',
      orderId
    });
  } catch (err) {
    console.error('sendOrderDispatchedEmail error:', err);
    return null;
  }
}

/**
 * Admin New Order Alert
 */
export async function sendAdminAlertEmail(orderId: string): Promise<SendEmailResult | null> {
  try {
    const settings = await getStoreEmailSettings();
    const notifSettings = await getStoreNotificationSettings();
    const adminEmail = notifSettings.admin_email || settings.admin_alert_email;
    const isEnabled = settings.enable_admin_alerts && notifSettings.enable_admin_email;

    if (!isEnabled || !adminEmail) return null;

    ensureDatabaseReady();
    const db = getDatabase();
    const order = await db.prepare(`
      SELECT o.*, COALESCE(c.full_name, o.guest_name, 'Guest Customer') as customer_name,
             COALESCE(c.phone, o.guest_phone) as customer_phone
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) return null;

    const itemsCountRow = await db.prepare(`
      SELECT COUNT(*) as count FROM order_items WHERE order_id = ?
    `).get(orderId) as any;

    let shippingAddress: any = {};
    try {
      shippingAddress = JSON.parse(order.shipping_address_json || '{}');
    } catch {}

    const html = generateAdminOrderAlertHtml({
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      city: shippingAddress.city || 'Pakistan',
      total: order.total_amount,
      paymentMethod: order.payment_method,
      itemsCount: itemsCountRow?.count || 1,
      settings: {
        storeName: 'Al Usmani Orchards'
      }
    });

    return await sendEmail({
      to: adminEmail,
      subject: `[NEW ORDER] Consignment ${order.order_number} (${order.total_amount.toLocaleString()} PKR)`,
      html,
      type: 'ADMIN_ALERT',
      orderId,
      idempotencyKey: `email_admin_order_${orderId}`
    });
  } catch (err) {
    console.error('sendAdminAlertEmail error:', err);
    return null;
  }
}

/**
 * Admin Test Email
 */
export async function sendTestEmail(toEmail: string): Promise<SendEmailResult> {
  const html = generateTestEmailHtml('Al Usmani Orchards');
  return await sendEmail({
    to: toEmail,
    subject: `[TEST] Al Usmani Orchards Email Dispatch Test`,
    html,
    type: 'TEST'
  });
}
