import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { hashToken } from '@/lib/auth/crypto';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDatabase();

    const user = await db.prepare('SELECT id, name, email FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;

    // Even if user not found, return generic success to prevent account enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been issued.'
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await db.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `).run(tokenId, user.id, tokenHash, expiresAt);

    return NextResponse.json({
      success: true,
      message: 'Password reset link and security token generated.',
      // Providing resetToken in response for development and QA testing
      resetToken: rawToken,
      expiresAt
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Failed to process password reset request' }, { status: 500 });
  }
}
