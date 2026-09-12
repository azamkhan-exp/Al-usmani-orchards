import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { requireAdmin } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/crypto';
import { recordAuditLog } from '@/lib/services/audit.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    ensureDatabaseReady();
    const auth = await requireAdmin();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
    }

    const db = getDatabase();
    const userRow = (await db.prepare(`
      SELECT id, name, username, email, phone, role, status, last_login_at, created_at,
             (password_hash IS NOT NULL) as has_password
      FROM users
      WHERE id = ?
    `).get(auth.user.id)) as any;

    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sessionCountRow = (await db.prepare(`
      SELECT COUNT(*) as count
      FROM user_sessions
      WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
    `).get(auth.user.id)) as any;

    return NextResponse.json({
      success: true,
      user: {
        id: userRow.id,
        name: userRow.name,
        username: userRow.username,
        email: userRow.email,
        phone: userRow.phone,
        role: userRow.role,
        status: userRow.status,
        hasPassword: Boolean(userRow.has_password),
        lastLoginAt: userRow.last_login_at,
        createdAt: userRow.created_at,
        activeSessions: Number(sessionCountRow?.count || 1)
      }
    });
  } catch (err: any) {
    console.error('Failed to get admin account info:', err);
    return NextResponse.json({ error: err.message || 'Failed to retrieve account details' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const auth = await requireAdmin();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
    }

    const body = await req.json();
    const { name, username, email, phone } = body;

    const db = getDatabase();

    // Validate email
    let cleanEmail: string | null = null;
    if (email !== undefined) {
      cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
      }

      const existingEmail = (await db.prepare(`
        SELECT id FROM users WHERE LOWER(email) = ? AND id != ?
      `).get(cleanEmail, auth.user.id)) as any;

      if (existingEmail) {
        return NextResponse.json({ error: 'This email address is already in use by another user.' }, { status: 409 });
      }
    }

    // Validate username
    let cleanUsername: string | null | undefined = undefined;
    if (username !== undefined && username !== null && typeof username === 'string' && username.trim() !== '') {
      const parsedUsername = username.trim().toLowerCase();
      if (parsedUsername.length < 3 || parsedUsername.length > 30) {
        return NextResponse.json({ error: 'Username must be between 3 and 30 characters.' }, { status: 400 });
      }
      if (!/^[a-z0-9_.-]+$/.test(parsedUsername)) {
        return NextResponse.json({ error: 'Username can only contain letters, numbers, hyphens, periods, and underscores.' }, { status: 400 });
      }

      const existingUsername = (await db.prepare(`
        SELECT id FROM users WHERE LOWER(username) = ? AND id != ?
      `).get(parsedUsername, auth.user.id)) as any;

      if (existingUsername) {
        return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 });
      }
      cleanUsername = parsedUsername;
    }

    // Validate name
    let cleanName: string | undefined = undefined;
    if (name !== undefined && typeof name === 'string') {
      const parsedName = name.trim();
      if (parsedName.length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 });
      }
      cleanName = parsedName;
    }

    const cleanPhone = phone !== undefined ? (phone ? String(phone).trim() : null) : undefined;

    // Build parameterized update
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (cleanName !== undefined) {
      updates.push('name = ?');
      params.push(cleanName);
    }
    if (cleanUsername !== undefined) {
      updates.push('username = ?');
      params.push(cleanUsername);
    }
    if (cleanEmail !== null && cleanEmail !== undefined) {
      updates.push('email = ?');
      params.push(cleanEmail);
    }
    if (cleanPhone !== undefined) {
      updates.push('phone = ?');
      params.push(cleanPhone);
    }

    params.push(auth.user.id);

    await db.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);

    await recordAuditLog({
      action: 'ADMIN_PROFILE_UPDATE',
      resourceType: 'USER',
      resourceId: auth.user.id,
      userId: auth.user.id,
      userEmail: auth.user.email,
      newState: { name: cleanName, username: cleanUsername, email: cleanEmail, phone: cleanPhone }
    });

    return NextResponse.json({
      success: true,
      message: 'Account details updated successfully.'
    });
  } catch (err: any) {
    console.error('Failed to update admin profile:', err);
    return NextResponse.json({ error: err.message || 'Failed to update account details' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const auth = await requireAdmin();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
    }

    const db = getDatabase();
    const userRow = (await db.prepare(`
      SELECT id, password_hash FROM users WHERE id = ?
    `).get(auth.user.id)) as any;

    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password if user already has a password set
    if (userRow.password_hash) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password.' }, { status: 400 });
      }
      const isValid = verifyPassword(currentPassword, userRow.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password does not match.' }, { status: 400 });
      }
    }

    const newHash = hashPassword(newPassword);

    await db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newHash, auth.user.id);

    await recordAuditLog({
      action: 'ADMIN_PASSWORD_CHANGE',
      resourceType: 'USER',
      resourceId: auth.user.id,
      userId: auth.user.id,
      userEmail: auth.user.email,
      newState: { message: 'Administrator changed their account password' }
    });

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated.'
    });
  } catch (err: any) {
    console.error('Failed to update admin password:', err);
    return NextResponse.json({ error: err.message || 'Failed to update password' }, { status: 500 });
  }
}
