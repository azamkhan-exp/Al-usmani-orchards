import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { performSystemHealthCheck } from '@/lib/services/health.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
    }

    const health = await performSystemHealthCheck();
    return NextResponse.json({ success: true, health });
  } catch (err: any) {
    console.error('System health check error:', err);
    return NextResponse.json(
      { error: 'Failed to run system diagnostics.' },
      { status: 500 }
    );
  }
}
