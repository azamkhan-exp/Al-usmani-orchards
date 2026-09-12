import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getWhatsAppConfig, sendWhatsAppMessage } from '@/lib/services/whatsapp.service';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const config = await getWhatsAppConfig();

    // Mask secret access token
    const maskedToken = config.accessToken
      ? `${config.accessToken.substring(0, 6)}••••••••••••••••${config.accessToken.slice(-4)}`
      : '';

    return NextResponse.json({
      success: true,
      config: {
        enabled: config.enabled,
        provider: config.provider,
        apiVersion: config.apiVersion,
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId,
        accessTokenMasked: maskedToken,
        hasAccessToken: Boolean(config.accessToken),
        webhookVerifyToken: config.webhookVerifyToken,
        adminNotificationNumber: config.adminNotificationNumber,
        webhookUrl: 'https://alusmaniorchards.pk/api/webhooks/whatsapp'
      }
    });
  } catch (err: any) {
    console.error('Error fetching admin WhatsApp config:', err);
    return NextResponse.json({ error: 'Failed to retrieve WhatsApp configuration' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. Test Meta API Connection
    if (action === 'test_connection') {
      const config = await getWhatsAppConfig();
      if (!config.phoneNumberId || !config.accessToken) {
        return NextResponse.json({
          success: false,
          status: 'UNCONFIGURED',
          message: 'Phone Number ID and Access Token must be provided to verify Meta API connection.'
        });
      }

      try {
        const metaUrl = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}`;
        const res = await fetch(metaUrl, {
          headers: { 'Authorization': `Bearer ${config.accessToken}` }
        });
        const data = await res.json();

        if (!res.ok) {
          return NextResponse.json({
            success: false,
            status: 'ERROR',
            message: data.error?.message || `Meta API verification failed with HTTP ${res.status}`,
            details: data.error
          });
        }

        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          message: `Connected successfully to WhatsApp Business Platform for ${data.verified_name || data.display_phone_number || 'Business Account'}!`,
          phoneDetails: data
        });
      } catch (connErr: any) {
        return NextResponse.json({
          success: false,
          status: 'NETWORK_ERROR',
          message: connErr.message || 'Failed to reach Meta Graph API servers.'
        });
      }
    }

    // 2. Send Test WhatsApp Notification
    if (action === 'send_test') {
      const { phone } = body;
      const targetPhone = phone || (await getWhatsAppConfig()).adminNotificationNumber;

      const result = await sendWhatsAppMessage({
        to: targetPhone,
        message: `🥭 *AL USMANI ORCHARDS — TEST NOTIFICATION*\n\nThis is a verified live test message from your Al Usmani Orchards Admin Dashboard.\n\nTime: ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Karachi' })} PKT\nStatus: *Active & Operational*`,
        eventType: 'TEST'
      });

      return NextResponse.json({
        success: result.success,
        status: result.status,
        message: result.success
          ? `Test message successfully transmitted to ${targetPhone} (${result.status})`
          : `Failed: ${result.error}`,
        logId: result.logId
      });
    }

    // 3. Save WhatsApp Configuration
    if (action === 'save_config') {
      const {
        enabled,
        provider,
        apiVersion,
        phoneNumberId,
        businessAccountId,
        accessToken,
        webhookVerifyToken,
        adminNotificationNumber
      } = body;

      ensureDatabaseReady();
      const db = getDatabase();

      const existingRow = await db.prepare(`SELECT value_json FROM store_settings WHERE key = 'whatsapp_business'`).get() as any;
      let currentVal = {};
      if (existingRow && existingRow.value_json) {
        try {
          currentVal = JSON.parse(existingRow.value_json);
        } catch {}
      }

      const updatedVal: any = {
        ...currentVal,
        enabled: enabled ?? true,
        provider: provider || 'SIMULATED',
        api_version: apiVersion || 'v21.0',
        phone_number_id: phoneNumberId || '',
        business_account_id: businessAccountId || '',
        webhook_verify_token: webhookVerifyToken || 'auo_whatsapp_verify_token_2026',
        admin_number: adminNotificationNumber || '+92 300 8472910'
      };

      // Only update access token if a new one was entered (not the masked one)
      if (accessToken && !accessToken.includes('••••')) {
        updatedVal.access_token = accessToken.trim();
      }

      await db.prepare(`
        INSERT INTO store_settings (id, key, value_json, updated_at)
        VALUES ('set_whatsapp_business', 'whatsapp_business', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')
      `).run(JSON.stringify(updatedVal));

      return NextResponse.json({
        success: true,
        message: 'WhatsApp Business configuration updated successfully.'
      });
    }

    return NextResponse.json({ error: 'Unknown action specified' }, { status: 400 });
  } catch (err: any) {
    console.error('Error handling admin WhatsApp request:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
