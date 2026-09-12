import { NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { getRecentAuditLogs } from '@/lib/services/audit.service';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'audit:read')) {
      return NextResponse.json({ error: 'Unauthorized: Audit log privileges required' }, { status: 403 });
    }

    const logs = await getRecentAuditLogs(100);
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    console.error('Admin audit logs error:', err);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
