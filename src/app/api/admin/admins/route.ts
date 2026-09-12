import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth/session';
import {
  listAdminUsers,
  createAdminUserDirectly,
  createAdminInvitation,
  authorizeAdminByEmail
} from '@/lib/services/admin-user.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAdmin('settings:*');
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
    }

    const data = listAdminUsers();
    return NextResponse.json({
      success: true,
      ...data,
      currentUserRole: auth.user.role
    });
  } catch (err: any) {
    console.error('Failed to list admin users:', err);
    return NextResponse.json({ error: 'Failed to retrieve administrative users.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Forbidden: Super Administrator required' }, { status: auth.status });
    }

    const body = await req.json();
    const { mode, type, email, role, name, password, phone } = body;
    const requestMode = (mode || type || '').toUpperCase();

    if (requestMode === 'DIRECT') {
      const result = createAdminUserDirectly({
        name,
        email,
        role,
        password,
        phone,
        actorUserId: auth.user.id,
        actorUserEmail: auth.user.email
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Administrator added successfully.',
        user: result.user
      });
    }

    // Default & Email Authorization Mode (Phases 4 & 5)
    const baseUrl = req.nextUrl.origin;
    const result = await authorizeAdminByEmail({
      email,
      role,
      appBaseUrl: baseUrl,
      actorUserId: auth.user.id,
      actorUserEmail: auth.user.email
    });

    if (!result.success) {
      const status = result.isAlreadyAdmin ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Administrator added successfully.',
      invitationUrl: result.invitationUrl,
      user: result.user
    });
  } catch (err: any) {
    console.error('Failed to create admin / invitation:', err);
    return NextResponse.json({ error: err?.message || 'Failed to process request.' }, { status: 500 });
  }
}
