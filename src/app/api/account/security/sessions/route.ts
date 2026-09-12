import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const sessions = db.prepare(`
      SELECT id, ip_address, user_agent, expires_at, created_at
      FROM user_sessions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(user.id);

    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    console.error('Customer sessions fetch error:', err);
    return NextResponse.json({ error: 'Failed to retrieve active sessions' }, { status: 500 });
  }
}
