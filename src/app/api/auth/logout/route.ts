import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth/session';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
