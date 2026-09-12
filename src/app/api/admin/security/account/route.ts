import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/crypto';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const db = getDatabase();
    const account = db.prepare(`
      SELECT id, username, name, email, role, phone, avatar_url, mfa_enabled, mfa_verified_at, last_login_at, created_at
      FROM users
      WHERE id = ?
    `).get(user.id) as any;

    return NextResponse.json({ success: true, account });
  } catch (err: any) {
    console.error('Failed to fetch account info:', err);
    return NextResponse.json({ error: 'Failed to retrieve account details.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { username, email, name, current_password } = body;

    if (!current_password) {
      return NextResponse.json(
        { error: 'Current password is required to update account security settings.' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const currentUserRow = db.prepare(`
      SELECT id, username, email, password_hash, role
      FROM users
      WHERE id = ?
    `).get(user.id) as any;

    if (!currentUserRow || !verifyPassword(current_password, currentUserRow.password_hash)) {
      return NextResponse.json(
        { error: 'Incorrect current password. Identity verification failed.' },
        { status: 401 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];
    const changes: Record<string, { from: any; to: any }> = {};

    // Username validation & update
    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3) {
        return NextResponse.json(
          { error: 'Username must be at least 3 characters.' },
          { status: 400 }
        );
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
        return NextResponse.json(
          { error: 'Username can only contain letters, numbers, hyphens, dots, and underscores.' },
          { status: 400 }
        );
      }

      const existingUser = db.prepare(`
        SELECT id FROM users WHERE LOWER(username) = ? AND id != ?
      `).get(cleanUsername, user.id);

      if (existingUser) {
        return NextResponse.json({ error: 'This username is already claimed.' }, { status: 409 });
      }

      updates.push('username = ?');
      params.push(cleanUsername);
      changes.username = { from: currentUserRow.username, to: cleanUsername };
    }

    // Email validation & update
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
      }

      const existingEmail = db.prepare(`
        SELECT id FROM users WHERE LOWER(email) = ? AND id != ?
      `).get(cleanEmail, user.id);

      if (existingEmail) {
        return NextResponse.json({ error: 'This email address is already in use.' }, { status: 409 });
      }

      updates.push('email = ?');
      params.push(cleanEmail);
      changes.email = { from: currentUserRow.email, to: cleanEmail };
    }

    // Name update
    if (name !== undefined && name.trim()) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true, message: 'No changes provided.' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(user.id);

    const updateSql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(updateSql).run(...params);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_PROFILE_UPDATED',
      resourceType: 'USER',
      resourceId: user.id,
      ipAddress: ip,
      previousState: JSON.stringify(currentUserRow),
      newState: JSON.stringify(changes)
    });

    const updatedUser = db.prepare(`
      SELECT id, username, name, email, role, phone, avatar_url, mfa_enabled, mfa_verified_at, last_login_at
      FROM users
      WHERE id = ?
    `).get(user.id);

    return NextResponse.json({
      success: true,
      message: 'Account profile updated successfully.',
      user: updatedUser
    });
  } catch (err: any) {
    console.error('Failed to update account security profile:', err);
    return NextResponse.json(
      { error: 'Failed to update account information.' },
      { status: 500 }
    );
  }
}
