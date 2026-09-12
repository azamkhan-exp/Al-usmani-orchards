import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, runTransaction } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { hashPassword, hashToken } from '@/lib/auth/crypto';
import { createSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const body = await req.json();
    const rawCode = (body.otp || body.token || '').trim();
    const { newPassword, email } = body;

    if (!rawCode || !newPassword) {
      return NextResponse.json({ error: 'Verification code and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
    }

    const tokenHash = hashToken(rawCode);
    const db = getDatabase();

    const record = (await db.prepare(`
      SELECT id, user_id, expires_at, used
      FROM password_reset_tokens
      WHERE token_hash = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
    `).get(tokenHash)) as any;

    if (!record) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please request a new code.' },
        { status: 400 }
      );
    }

    const user = (await db.prepare(`
      SELECT id, name, email, role, status
      FROM users
      WHERE id = ?
    `).get(record.user_id)) as any;

    if (!user) {
      return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    }

    if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'Verification code does not match this email address.' }, { status: 400 });
    }

    const newHash = hashPassword(newPassword);

    await runTransaction(async (database: any) => {
      // 1. Update user password
      await database.prepare(`
        UPDATE users
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newHash, user.id);

      // 2. Mark token as used
      await database.prepare(`
        UPDATE password_reset_tokens
        SET used = 1
        WHERE id = ?
      `).run(record.id);

      // 3. Invalidate old sessions for security
      await database.prepare(`
        DELETE FROM user_sessions
        WHERE user_id = ?
      `).run(user.id);
    });

    // 4. Auto-login the user with a secure session cookie
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
    const userAgent = req.headers.get('user-agent') || '';

    await createSession(user.id, ipAddress, userAgent);

    return NextResponse.json({
      success: true,
      message: 'Password successfully reset! You are now securely logged in.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}

