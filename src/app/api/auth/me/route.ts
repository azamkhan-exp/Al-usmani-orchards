import { NextResponse } from 'next/server';
import { getCurrentUser, destroySession } from '@/lib/auth/session';
import { ensureDatabaseReady } from '@/lib/db/init';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }
    return NextResponse.json({ authenticated: true, user });
  } catch (err) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
