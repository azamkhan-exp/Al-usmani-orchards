import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/session';
import { revokeAdminSessions } from '@/lib/services/admin-user.service';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Forbidden: Super Administrator required' }, { status: auth.status });
    }

    const { id } = await params;
    const result = await revokeAdminSessions({
      targetUserId: id,
      actorUserId: auth.user.id,
      actorUserEmail: auth.user.email
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to revoke sessions.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Revoked ${result.revokedCount} active session(s).`,
      revokedCount: result.revokedCount
    });
  } catch (err: any) {
    console.error('Failed to revoke admin sessions:', err);
    return NextResponse.json({ error: err?.message || 'Failed to revoke sessions.' }, { status: 500 });
  }
}
