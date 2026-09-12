import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, runTransaction } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { hashPassword, hashToken } from '@/lib/auth/crypto';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const db = getDatabase();

    const record = db.prepare(`
      SELECT id, user_id, expires_at, used
      FROM password_reset_tokens
      WHERE token_hash = ? AND used = 0 AND expires_at > datetime('now')
    `).get(tokenHash) as any;

    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired password reset token' }, { status: 400 });
    }

    const newHash = hashPassword(newPassword);

    runTransaction((database) => {
      // 1. Update user password
      database.prepare(`
        UPDATE users
        SET password_hash = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newHash, record.user_id);

      // 2. Mark token as used
      database.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(record.id);

      // 3. Invalidate old sessions for security
      database.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(record.user_id);
    });

    return NextResponse.json({ success: true, message: 'Password has been successfully updated.' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
