import { getDatabase } from '../db';
import { ensureDatabaseReady } from '../db/init';
import { getAllStoreSettings, getStoreNotificationSettings } from './settings.service';
import { isFeatureEnabled } from './features.service';
import { formatPKR } from '../formatters';
import crypto from 'node:crypto';

export type WhatsAppEventType =
  | 'ADMIN_NEW_ORDER'
  | 'CUSTOMER_ORDER_CONFIRMED'
  | 'ORDER_DISPATCHED'
  | 'ORDER_DELIVERED'
  | 'BACK_IN_STOCK'
  | 'ABANDONED_CART'
  | 'TEST'
  | 'TEST_DISPATCH'
  | (string & {});

export interface SendWhatsAppOptions {
  to: string;
  message: string;
  orderId?: string;
  eventType: WhatsAppEventType;
  idempotencyKey?: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
}

export interface SendWhatsAppResult {
  success: boolean;
  status: 'SENT' | 'SIMULATED' | 'FAILED' | 'DUPLICATE_SKIPPED' | 'DISABLED';
  error?: string;
  logId?: string;
  providerResponse?: any;
}

export interface WhatsAppConfig {
  enabled: boolean;
  provider: 'META_CLOUD' | 'SIMULATED';
  apiVersion: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  webhookVerifyToken: string;
  adminNotificationNumber: string;
}

/**
 * Retrieve active WhatsApp credentials safely from SQLite store_settings or environment variables.
 * Secrets are never exposed to client-side bundles.
 */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const storeSettings = await getAllStoreSettings();
  const notifSettings = storeSettings.notifications || {};
  const waSettings = storeSettings.whatsapp_business || {};

  const enabled = process.env.WHATSAPP_ENABLED
    ? process.env.WHATSAPP_ENABLED === 'true'
    : (waSettings.enabled ?? notifSettings.enable_customer_whatsapp ?? true);

  const provider = (process.env.WHATSAPP_PROVIDER || waSettings.provider || notifSettings.whatsapp_provider || 'SIMULATED') as 'META_CLOUD' | 'SIMULATED';
  const apiVersion = process.env.WHATSAPP_API_VERSION || waSettings.api_version || 'v21.0';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || waSettings.phone_number_id || notifSettings.meta_phone_number_id || '';
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || waSettings.business_account_id || '';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || waSettings.access_token || notifSettings.meta_access_token || '';
  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || waSettings.webhook_verify_token || 'auo_whatsapp_verify_token_2026';
  const adminNotificationNumber = process.env.WHATSAPP_ADMIN_NUMBER || waSettings.admin_number || notifSettings.admin_whatsapp || '+92 300 8472910';

  return {
    enabled,
    provider,
    apiVersion,
    phoneNumberId,
    businessAccountId,
    accessToken,
    webhookVerifyToken,
    adminNotificationNumber
  };
}

/**
 * Format raw Pakistan/International phone number for WhatsApp E.164 without '+' or spaces.
 * e.g. '0300 8472910' -> '923008472910', '+92-300-8472910' -> '923008472910'
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('03')) {
    cleaned = '92' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Core WhatsApp messaging dispatcher supporting Meta WhatsApp Business Cloud API
 * with high-fidelity SIMULATED fallback and decoupled non-blocking error handling.
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
  // Feature flag check
  if (!(await isFeatureEnabled('whatsapp_notifications')) && options.eventType !== 'TEST') {
    return {
      success: true,
      status: 'DISABLED'
    };
  }

  ensureDatabaseReady();
  const db = getDatabase();
  const config = await getWhatsAppConfig();
  const logId = `wlog_${crypto.randomUUID()}`;
  const idempotencyKey = options.idempotencyKey || (options.orderId ? `wa_${options.eventType}_${options.orderId}` : null);

  // 1. Idempotency Check: prevent duplicate messages within 10 minutes
  if (idempotencyKey) {
    try {
      const existing = await db
        .prepare(`SELECT id, status, created_at FROM notification_logs WHERE idempotency_key = ? AND created_at > datetime('now', '-10 minutes')`)
        .get(idempotencyKey) as any;

      if (existing) {
        console.log(`[WHATSAPP] Skipped duplicate dispatch for idempotencyKey: ${idempotencyKey}`);
        return {
          success: true,
          status: 'DUPLICATE_SKIPPED',
          logId: existing.id
        };
      }
    } catch (idemErr) {
      console.warn('[WHATSAPP] Idempotency query check warning:', idemErr);
    }
  }

  const sanitizedTo = sanitizeWhatsAppPhone(options.to);
  const payloadJson = JSON.stringify({
    to: sanitizedTo,
    originalTo: options.to,
    message: options.message,
    eventType: options.eventType
  });

  // 2. Simulated Mode Fallback (Default if Meta credentials are not provided or provider === 'SIMULATED')
  const isMetaConfigured =
    config.provider === 'META_CLOUD' &&
    Boolean(config.phoneNumberId?.trim()) &&
    Boolean(config.accessToken?.trim());

  if (!isMetaConfigured) {
    try {
      await db.prepare(`
        INSERT INTO notification_logs (id, order_id, recipient, subject, type, status, error, channel, idempotency_key, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'SIMULATED', 'Logged in simulation mode (Meta Cloud API credentials not configured)', 'WHATSAPP', ?, ?, datetime('now'))
      `).run(
        logId,
        options.orderId || null,
        options.to,
        `WhatsApp Alert: ${options.eventType}`,
        options.eventType,
        idempotencyKey,
        payloadJson
      );
    } catch (logErr) {
      console.error('Failed to log simulated WhatsApp alert:', logErr);
    }

    return {
      success: true,
      status: 'SIMULATED',
      logId
    };
  }

  // 3. Official Meta WhatsApp Cloud API Live Transmission
  try {
    const metaUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: sanitizedTo,
        type: 'text',
        text: {
          preview_url: true,
          body: options.message
        }
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errMsg = responseData.error?.message || `Meta API HTTP ${response.status}`;
      await db.prepare(`
        INSERT INTO notification_logs (id, order_id, recipient, subject, type, status, error, channel, idempotency_key, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, 'FAILED', ?, 'WHATSAPP', ?, ?, datetime('now'))
      `).run(
        logId,
        options.orderId || null,
        options.to,
        `WhatsApp Alert: ${options.eventType}`,
        options.eventType,
        errMsg,
        idempotencyKey,
        payloadJson
      );

      return {
        success: false,
        status: 'FAILED',
        error: errMsg,
        logId,
        providerResponse: responseData
      };
    }

    // Successfully dispatched to Meta Cloud API
    await db.prepare(`
      INSERT INTO notification_logs (id, order_id, recipient, subject, type, status, error, channel, idempotency_key, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, 'SENT', NULL, 'WHATSAPP', ?, ?, datetime('now'))
    `).run(
      logId,
      options.orderId || null,
      options.to,
      `WhatsApp Alert: ${options.eventType}`,
      options.eventType,
      idempotencyKey,
      payloadJson
    );

    return {
      success: true,
      status: 'SENT',
      logId,
      providerResponse: responseData
    };
  } catch (err: any) {
    console.error('WhatsApp Cloud API transmission error:', err);

    await db.prepare(`
      INSERT INTO notification_logs (id, order_id, recipient, subject, type, status, error, channel, idempotency_key, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, 'FAILED', ?, 'WHATSAPP', ?, ?, datetime('now'))
    `).run(
      logId,
      options.orderId || null,
      options.to,
      `WhatsApp Alert: ${options.eventType}`,
      options.eventType,
      err.message || 'Unknown network exception',
      idempotencyKey,
      payloadJson
    );

    return {
      success: false,
      status: 'FAILED',
      error: err.message || 'WhatsApp transmission failed',
      logId
    };
  }
}

/**
 * Dispatch automated WhatsApp alert to Admin when a new order is confirmed.
 */
export async function sendAdminNewOrderWhatsAppAlert(orderId: string): Promise<SendWhatsAppResult | null> {
  try {
    const config = await getWhatsAppConfig();
    const adminPhone = config.adminNotificationNumber;
    if (!adminPhone) return null;

    ensureDatabaseReady();
    const db = getDatabase();

    const order = await db.prepare(`
      SELECT 
        o.id, o.order_number, o.total_amount, o.payment_method, o.payment_status,
        o.guest_name, o.guest_phone, o.is_gift, o.gift_recipient,
        c.full_name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) return null;

    const items = await db.prepare(`
      SELECT variety_name, package_name, quantity, unit_price, subtotal
      FROM order_items
      WHERE order_id = ?
    `).all(orderId) as any[];

    const patronName = order.customer_name || order.guest_name || 'Valued Patron';
    const itemsSummary = items
      .map((it) => `• ${it.quantity}x ${it.variety_name} (${it.package_name}) - ${formatPKR(it.subtotal)}`)
      .join('\n');

    const giftText = order.is_gift ? `\n🎁 *Royal Gift Order* for ${order.gift_recipient || 'Recipient'}` : '';

    const message = `👑 *AL USMANI ORCHARDS — NEW HARVEST ORDER* 🥭\n\n` +
      `Consignment: *#${order.order_number}*\n` +
      `Patron: *${patronName}*\n` +
      `Payment: *${order.payment_method}* (${order.payment_status})\n` +
      `Total Due: *${formatPKR(order.total_amount)}*${giftText}\n\n` +
      `*Harvest Crates:*\n${itemsSummary}\n\n` +
      `📦 Please prepare ventilated export cartons for dawn temperature-controlled cold dispatch.\n` +
      `Admin Portal: https://alusmaniorchards.pk/admin/orders`;

    return await sendWhatsAppMessage({
      to: adminPhone,
      message,
      orderId,
      eventType: 'ADMIN_NEW_ORDER'
    });
  } catch (err) {
    console.error('Failed to trigger admin WhatsApp alert:', err);
    return null;
  }
}

/**
 * Dispatch automated WhatsApp confirmation to customer upon order placement.
 */
export async function sendCustomerOrderWhatsAppConfirmation(orderId: string): Promise<SendWhatsAppResult | null> {
  try {
    ensureDatabaseReady();
    const db = getDatabase();

    const order = await db.prepare(`
      SELECT 
        o.id, o.order_number, o.total_amount, o.payment_method, o.guest_name, o.guest_phone,
        c.full_name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) return null;

    const patronPhone = order.customer_phone || order.guest_phone;
    if (!patronPhone) return null;

    const patronName = order.customer_name || order.guest_name || 'Valued Patron';

    const items = await db.prepare(`
      SELECT variety_name, package_name, quantity
      FROM order_items
      WHERE order_id = ?
    `).all(orderId) as any[];

    const itemsList = items.map((i) => `• ${i.quantity}x ${i.variety_name} (${i.package_name})`).join('\n');

    const message = `Salam *${patronName}*, thank you for choosing *Al Usmani Orchards*! 🥭\n\n` +
      `Your harvest order *#${order.order_number}* is *Confirmed*.\n\n` +
      `*Harvest Crates in Consignment:*\n${itemsList}\n\n` +
      `Total: *${formatPKR(order.total_amount)}* (${order.payment_method})\n\n` +
      `🌿 Your mangoes will be hand-plucked at dawn, cushioned with foam sleeves, and dispatched via 24-hour temperature-controlled cold-chain.\n\n` +
      `Track your live shipment anytime:\n` +
      `https://alusmaniorchards.pk/track-order?order=${order.order_number}`;

    return await sendWhatsAppMessage({
      to: patronPhone,
      message,
      orderId,
      eventType: 'CUSTOMER_ORDER_CONFIRMED'
    });
  } catch (err) {
    console.error('Failed to trigger customer WhatsApp confirmation:', err);
    return null;
  }
}

/**
 * Dispatch automated WhatsApp alert when order is marked SHIPPED.
 */
export async function sendOrderDispatchedWhatsApp(orderId: string): Promise<SendWhatsAppResult | null> {
  try {
    ensureDatabaseReady();
    const db = getDatabase();

    const order = await db.prepare(`
      SELECT 
        o.id, o.order_number, o.guest_name, o.guest_phone,
        c.full_name as customer_name, c.phone as customer_phone,
        s.tracking_number, co.name as courier_name
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN shipments s ON s.order_id = o.id
      LEFT JOIN couriers co ON co.id = s.courier_id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) return null;

    const patronPhone = order.customer_phone || order.guest_phone;
    if (!patronPhone) return null;

    const patronName = order.customer_name || order.guest_name || 'Valued Patron';
    const carrier = order.courier_name || 'Cold-Chain Logistics';
    const tracking = order.tracking_number ? `\nConsignment #: *${order.tracking_number}*` : '';

    const message = `🚚 *AL USMANI ORCHARDS — SHIPMENT DISPATCHED* 🥭\n\n` +
      `Salam *${patronName}*, your harvest consignment *#${order.order_number}* has been dispatched from our Multan royal groves via *${carrier}*.${tracking}\n\n` +
      `Your fruit is individually sleeved and transported under strict temperature control.\n\n` +
      `Track live delivery:\nhttps://alusmaniorchards.pk/track-order?order=${order.order_number}`;

    return await sendWhatsAppMessage({
      to: patronPhone,
      message,
      orderId,
      eventType: 'ORDER_DISPATCHED'
    });
  } catch (err) {
    console.error('Failed to trigger dispatched WhatsApp alert:', err);
    return null;
  }
}

/**
 * Dispatch automated WhatsApp alert when a subscribed back-in-stock variety returns to stock.
 */
export async function sendBackInStockWhatsApp(phone: string, varietyName: string, packageName: string, productUrl: string): Promise<SendWhatsAppResult | null> {
  try {
    const message = `🎉 *GOOD NEWS FROM AL USMANI ORCHARDS* 🥭\n\n` +
      `The harvest crate you requested — *${varietyName} (${packageName})* — is back in stock at our Multan cold storage!\n\n` +
      `Due to high seasonal demand, crates are reserved on a first-come, first-served basis.\n\n` +
      `Reserve your crate now:\n${productUrl}`;

    return await sendWhatsAppMessage({
      to: phone,
      message,
      eventType: 'BACK_IN_STOCK'
    });
  } catch (err) {
    console.error('Failed to trigger back-in-stock WhatsApp alert:', err);
    return null;
  }
}

/**
 * Dispatch test message to verify WhatsApp connectivity and credentials.
 */
export async function sendTestWhatsAppMessage(recipient: string, customMessage?: string): Promise<SendWhatsAppResult> {
  const message = customMessage || `👑 *AL USMANI ORCHARDS — CLOUD API TEST* 🥭\n\n` +
    `Salam! This is a verified test dispatch from the Al Usmani Orchards Meta WhatsApp Business Cloud API system.\n\n` +
    `Timestamp: ${new Date().toISOString()}\nStatus: Live & Connected`;

  return await sendWhatsAppMessage({
    to: recipient,
    message,
    eventType: 'TEST_DISPATCH',
    idempotencyKey: `test_wa_${Date.now()}`
  });
}

