import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/session';
import { updateAdminRole, updateAdminStatus, deleteAdminUser } from '@/lib/services/admin-user.service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Forbidden: Super Administrator required' }, { status: auth.status });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, status } = body;

    if (role) {
      const result = await updateAdminRole({
        targetUserId: id,
        newRole: role,
        actorUserId: auth.user.id,
        actorUserEmail: auth.user.email
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    if (status) {
      if (status !== 'ACTIVE' && status !== 'SUSPENDED') {
        return NextResponse.json({ error: 'Status must be ACTIVE or SUSPENDED.' }, { status: 400 });
      }

      const result = await updateAdminStatus({
        targetUserId: id,
        newStatus: status,
        actorUserId: auth.user.id,
        actorUserEmail: auth.user.email
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Administrator updated successfully.'
    });
  } catch (err: any) {
    console.error('Failed to update admin:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update administrator.' }, { status: 500 });
  }
}

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
    const result = await deleteAdminUser({
      targetUserId: id,
      actorUserId: auth.user.id,
      actorUserEmail: auth.user.email
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Administrator removed successfully.'
    });
  } catch (err: any) {
    console.error('Failed to delete admin:', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete administrator.' }, { status: 500 });
  }
}
