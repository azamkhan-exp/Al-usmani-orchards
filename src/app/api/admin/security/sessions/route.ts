import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, getUserActiveSessions, revokeSession, revokeOtherSessions } from '@/lib/auth/session';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const sessions = await getUserActiveSessions(user.id);
    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    console.error('Fetch sessions error:', err);
    return NextResponse.json({ error: 'Failed to retrieve active sessions.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    const allOther = searchParams.get('all_other') === 'true';

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    if (allOther) {
      const revokedCount = await revokeOtherSessions(user.id);
      recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_SESSIONS_REVOKED',
        resourceType: 'SESSION',
        ipAddress: ip,
        newState: JSON.stringify({ type: 'ALL_OTHER', count: revokedCount })
      });

      return NextResponse.json({
        success: true,
        message: `Revoked ${revokedCount} other active session(s).`
      });
    }

    if (sessionId) {
      const revoked = await revokeSession(sessionId, user.id);
      if (!revoked) {
        return NextResponse.json({ error: 'Session not found or already expired.' }, { status: 404 });
      }

      recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'ADMIN_SESSION_REVOKED',
        resourceType: 'SESSION',
        resourceId: sessionId,
        ipAddress: ip
      });

      return NextResponse.json({
        success: true,
        message: 'Session revoked successfully.'
      });
    }

    return NextResponse.json(
      { error: 'Specify either session_id or all_other=true.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Revoke session error:', err);
    return NextResponse.json({ error: 'Failed to revoke session.' }, { status: 500 });
  }
}
