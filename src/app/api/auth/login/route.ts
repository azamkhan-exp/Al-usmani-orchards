import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { verifyPassword } from '@/lib/auth/crypto';
import { createSession } from '@/lib/auth/session';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const db = getDatabase();
    const cleanEmail = email.trim().toLowerCase();

    const user = db.prepare(`
      SELECT id, name, email, password_hash, role, phone, status
      FROM users
      WHERE LOWER(email) = ?
    `).get(cleanEmail) as any;

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is suspended or inactive.' }, { status: 403 });
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';

    await createSession(user.id, ip, userAgent);

    if (user.role !== 'CUSTOMER') {
      recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_LOGIN_SUCCESS',
        resourceType: 'AUTH',
        resourceId: user.id,
        ipAddress: ip
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 500 });
  }
}
