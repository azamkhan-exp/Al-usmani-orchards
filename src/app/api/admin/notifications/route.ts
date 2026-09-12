import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { sendTestEmail, sendEmail } from '@/lib/email';
import { sendTestWhatsAppMessage, sendWhatsAppMessage } from '@/lib/services/whatsapp.service';

// 1. GET /api/admin/notifications - Retrieve recent notification dispatch logs
export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'settings:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDatabase();
    const logs = db
      .prepare(`
        SELECT nl.*, o.order_number
        FROM notification_logs nl
        LEFT JOIN orders o ON o.id = nl.order_id
        ORDER BY nl.created_at DESC
        LIMIT 50
      `)
      .all();

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    console.error('Error fetching notification logs:', err);
    return NextResponse.json({ error: 'Failed to fetch notification logs' }, { status: 500 });
  }
}

// 2. POST /api/admin/notifications - Test dispatches or retry failed notifications
export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'settings:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { action, recipient, logId } = body;
    const db = getDatabase();

    if (action === 'TEST_EMAIL') {
      if (!recipient) {
        return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
      }
      const result = await sendTestEmail(recipient);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'TEST_WHATSAPP') {
      if (!recipient) {
        return NextResponse.json({ error: 'Recipient WhatsApp phone number is required' }, { status: 400 });
      }
      const result = await sendTestWhatsAppMessage(recipient);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'RETRY') {
      if (!logId) {
        return NextResponse.json({ error: 'logId is required' }, { status: 400 });
      }

      const log = db.prepare('SELECT * FROM notification_logs WHERE id = ?').get(logId) as any;
      if (!log) {
        return NextResponse.json({ error: 'Notification log entry not found' }, { status: 404 });
      }

      if (log.channel === 'WHATSAPP') {
        let payload: any = {};
        try {
          payload = JSON.parse(log.payload_json || '{}');
        } catch {}

        const result = await sendWhatsAppMessage({
          to: log.recipient,
          message: payload.message || `[RETRY] Notification for Order ${log.order_id || 'System'}`,
          orderId: log.order_id,
          eventType: log.type || 'RETRY',
          idempotencyKey: `retry_wa_${Date.now()}`
        });

        return NextResponse.json({ success: true, result });
      } else {
        const result = await sendEmail({
          to: log.recipient,
          subject: `[RETRY] ${log.subject}`,
          html: `<p>This is a retried notification dispatch from Al Usmani Orchards administrative console.</p>`,
          type: log.type || 'TEST',
          orderId: log.order_id,
          idempotencyKey: `retry_email_${Date.now()}`
        });

        return NextResponse.json({ success: true, result });
      }
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in notifications POST:', err);
    return NextResponse.json({ error: err.message || 'Notification action failed' }, { status: 500 });
  }
}
