import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/crypto';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function GET(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'settings:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDatabase();

    const rows = (await db.prepare(`SELECT key, value_json FROM store_settings`).all()) as Array<{
      key: string;
      value_json: string;
    }>;

    const settings: Record<string, any> = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value_json);
      } catch {
        settings[row.key] = {};
      }
    }

    const couriersList = await db.prepare(`
      SELECT id, name, code, tracking_url_template, logo_url, cod_supported, is_active
      FROM couriers
      ORDER BY name ASC
    `).all();

    return NextResponse.json({
      success: true,
      settings,
      couriersList,
      adminUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Fetch settings error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'settings:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { section, data, passwordChange } = body;
    const db = getDatabase();

    // 1. Password change requested
    if (passwordChange) {
      const { currentPassword, newPassword } = passwordChange;
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
      }

      const dbUser = (await db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(user.id)) as any;
      if (!dbUser || !verifyPassword(currentPassword, dbUser.password_hash)) {
        return NextResponse.json({ error: 'Current password verification failed.' }, { status: 400 });
      }

      const newHash = hashPassword(newPassword);
      await db.prepare(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newHash, user.id);

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_PASSWORD_CHANGED',
        resourceType: 'USER',
        resourceId: user.id
      });
    }

    // 2. Courier updates if section is 'couriers'
    if (section === 'couriers' && Array.isArray(data?.couriers)) {
      const updateCourier = db.prepare(`
        UPDATE couriers 
        SET is_active = ?, tracking_url_template = ?
        WHERE id = ?
      `);

      for (const cr of data.couriers) {
        await updateCourier.run(cr.is_active ? 1 : 0, cr.tracking_url_template, cr.id);
      }
    }

    // 3. Upsert into store_settings
    if (section && data) {
      const valueJson = JSON.stringify(data);
      const existing = (await db.prepare(`SELECT id FROM store_settings WHERE key = ?`).get(section)) as any;

      if (existing) {
        await db.prepare(`
          UPDATE store_settings 
          SET value_json = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE key = ?
        `).run(valueJson, section);
      } else {
        await db.prepare(`
          INSERT INTO store_settings (id, key, value_json, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `).run(`set-${section}`, section, valueJson);
      }

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'SETTING_UPDATED',
        resourceType: 'SETTING',
        resourceId: section,
        newState: data
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Store settings saved successfully.'
    });
  } catch (err: any) {
    console.error('Update settings error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save settings' }, { status: 500 });
  }
}
