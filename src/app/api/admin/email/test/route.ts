import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { sendTestEmail } from '@/lib/email';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'settings:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { toEmail } = body;

    if (!toEmail || !toEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid destination email address is required.' }, { status: 400 });
    }

    const result = await sendTestEmail(toEmail);

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'EMAIL_TEST_SENT',
      resourceType: 'SETTING',
      resourceId: 'email',
      newState: { toEmail, status: result.status }
    });

    return NextResponse.json({
      success: true,
      status: result.status,
      message: result.status === 'SENT'
        ? `Test email sent to ${toEmail} successfully via configured SMTP.`
        : `Test email logged successfully in simulation mode to notification_logs for ${toEmail}.`
    });
  } catch (err: any) {
    console.error('Test email route error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send test email' }, { status: 500 });
  }
}
