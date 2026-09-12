import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, runTransaction } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { hashPassword } from '@/lib/auth/crypto';
import { createSession } from '@/lib/auth/session';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const body = await req.json();
    const { name, email, password, phone, city } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Prevent public registration hijacking of administrative owner account
    const { isOwnerEmail } = await import('@/lib/auth/session');
    if (isOwnerEmail(cleanEmail)) {
      return NextResponse.json({
        error: 'Administrative accounts cannot be registered via public registration. Please sign in directly.'
      }, { status: 400 });
    }

    const db = getDatabase();

    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const customerId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const referralCode = `AUO-${Math.floor(1000 + Math.random() * 9000)}`;

    await runTransaction(async (database) => {
      await database.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, phone, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'CUSTOMER', ?, 'ACTIVE', datetime('now'), datetime('now'))
      `).run(userId, name.trim(), cleanEmail, passwordHash, phone || null);

      await database.prepare(`
        INSERT INTO customers (id, user_id, full_name, email, phone, city, segment, total_spent, orders_count, referral_code, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'NEW', 0, 0, ?, datetime('now'))
      `).run(customerId, userId, name.trim(), cleanEmail, phone || null, city || null, referralCode);
    });

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';
    await createSession(userId, ip, userAgent);

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role: 'CUSTOMER',
        phone: phone || null
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
