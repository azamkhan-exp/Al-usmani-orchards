import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppConfig } from '@/lib/services/whatsapp.service';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';

export const dynamic = 'force-dynamic';

/**
 * Meta WhatsApp Webhook Verification Handshake
 * Used when configuring webhook URL in Meta App Dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const config = await getWhatsAppConfig();

    if (mode === 'subscribe' && token === config.webhookVerifyToken) {
      console.log('[WHATSAPP WEBHOOK] Verified Meta handshake successfully.');
      return new Response(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    console.warn('[WHATSAPP WEBHOOK] Rejected invalid verification handshake token:', token);
    return new Response('Forbidden', { status: 403 });
  } catch (err: any) {
    console.error('[WHATSAPP WEBHOOK] Verification error:', err);
    return new Response('Internal Error', { status: 500 });
  }
}

/**
 * Meta WhatsApp Inbound Event & Delivery Status Receiver
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Fast check: verify this is a whatsapp_business_account payload
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'IGNORED' }, { status: 200 });
    }

    ensureDatabaseReady();
    const db = getDatabase();

    // Iterate through entry changes
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // 1. Delivery Status Updates (sent, delivered, read, failed)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const s of value.statuses) {
            const waMessageId = s.id;
            const status = s.status ? s.status.toUpperCase() : 'UNKNOWN';
            const recipient = s.recipient_id;

            try {
              // Update status in notification_logs if found by payload
              await db.prepare(`
                UPDATE notification_logs
                SET status = ?, error = ?
                WHERE recipient LIKE ? AND channel = 'WHATSAPP' AND created_at > datetime('now', '-2 days')
              `).run(status, s.errors ? JSON.stringify(s.errors) : null, `%${recipient}%`);
            } catch (updateErr) {
              console.warn('[WHATSAPP WEBHOOK] Status update warning:', updateErr);
            }
          }
        }

        // 2. Inbound Customer Replies
        if (value.messages && Array.isArray(value.messages)) {
          for (const msg of value.messages) {
            const sender = msg.from;
            const text = msg.text?.body || '[Non-text message]';
            console.log(`[WHATSAPP INBOUND] Message from ${sender}: ${text}`);
            // Log inbound interaction into notification_logs
            try {
              const crypto = require('node:crypto');
              await db.prepare(`
                INSERT INTO notification_logs (id, order_id, recipient, subject, type, status, error, channel, payload_json, created_at)
                VALUES (?, NULL, ?, 'Customer Inbound WhatsApp Reply', 'INBOUND_REPLY', 'RECEIVED', NULL, 'WHATSAPP', ?, datetime('now'))
              `).run(
                `inbound_${crypto.randomUUID()}`,
                sender,
                JSON.stringify({ from: sender, text, messageId: msg.id })
              );
            } catch (logErr) {
              // Ignore
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (err: any) {
    console.error('[WHATSAPP WEBHOOK] Event processing exception:', err);
    // Always return 200 to prevent Meta from retrying indefinitely on parse errors
    return NextResponse.json({ status: 'PROCESSED_WITH_WARNINGS' }, { status: 200 });
  }
}
