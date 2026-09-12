import { NextRequest, NextResponse } from 'next/server';
import { validateInvitationToken, acceptAdminInvitation } from '@/lib/services/admin-user.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
    }

    const validation = validateInvitationToken(token);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || 'Invalid or expired invitation.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      email: validation.email,
      name: validation.name,
      role: validation.role,
      expires_at: validation.expires_at
    });
  } catch (err: any) {
    console.error('Validate invitation error:', err);
    return NextResponse.json({ error: 'Failed to validate invitation.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, name, password, phone } = body;

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: 'Token, full name, and master password are required.' },
        { status: 400 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'StaffAcceptInvite';

    const result = await acceptAdminInvitation({
      token,
      name,
      password,
      phone,
      ipAddress: ip,
      userAgent
    });

    if (!result.success || !result.user) {
      return NextResponse.json({ error: result.error || 'Failed to accept invitation.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted. Administrator account activated successfully.',
      user: result.user
    });
  } catch (err: any) {
    console.error('Accept invitation error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to accept invitation.' }, { status: 500 });
  }
}
