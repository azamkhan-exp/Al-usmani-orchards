import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, revokeOtherSessions } from '@/lib/auth/session';
import { verifyPassword, hashPassword } from '@/lib/auth/crypto';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { current_password, new_password, confirm_password, invalidate_other_sessions = true } = body;

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'Current password and new password are required.' },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters in length.' },
        { status: 400 }
      );
    }

    if (confirm_password && new_password !== confirm_password) {
      return NextResponse.json(
        { error: 'New password and confirmation do not match.' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const userRow = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as any;

    if (!userRow || !verifyPassword(current_password, userRow.password_hash)) {
      return NextResponse.json(
        { error: 'Incorrect current password. Verification failed.' },
        { status: 401 }
      );
    }

    const newHash = hashPassword(new_password);
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newHash, user.id);

    let revokedCount = 0;
    if (invalidate_other_sessions) {
      revokedCount = await revokeOtherSessions(user.id);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ADMIN_PASSWORD_CHANGED',
      resourceType: 'USER',
      resourceId: user.id,
      ipAddress: ip,
      newState: JSON.stringify({
        revoked_sessions: revokedCount,
        timestamp: new Date().toISOString()
      })
    });

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated.',
      revoked_sessions_count: revokedCount
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return NextResponse.json(
      { error: 'Failed to update password.' },
      { status: 500 }
    );
  }
}
