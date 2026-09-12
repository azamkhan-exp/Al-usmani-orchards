import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';
import { verifyPassword, hashPassword } from '@/lib/auth/crypto';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Both current password and new password are required.' },
        { status: 400 }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const user = await db.prepare(`SELECT id, password_hash FROM users WHERE id = ?`).get(currentUser.id) as any;

    if (!user) {
      return NextResponse.json({ error: 'User record not found.' }, { status: 404 });
    }

    const isMatch = verifyPassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
    }

    const newHash = hashPassword(newPassword);
    await db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newHash, user.id);

    return NextResponse.json({
      success: true,
      message: 'Your account password has been updated securely.'
    });
  } catch (err: any) {
    console.error('Customer password update error:', err);
    return NextResponse.json(
      { error: 'Failed to update password. Please try again.' },
      { status: 500 }
    );
  }
}
