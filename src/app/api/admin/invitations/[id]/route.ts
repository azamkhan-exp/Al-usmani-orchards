import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/session';
import { cancelAdminInvitation } from '@/lib/services/admin-user.service';

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
    const result = cancelAdminInvitation({
      invitationId: id,
      actorUserId: auth.user.id,
      actorUserEmail: auth.user.email
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to cancel invitation.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully.'
    });
  } catch (err: any) {
    console.error('Failed to cancel invitation:', err);
    return NextResponse.json({ error: err?.message || 'Failed to cancel invitation.' }, { status: 500 });
  }
}
