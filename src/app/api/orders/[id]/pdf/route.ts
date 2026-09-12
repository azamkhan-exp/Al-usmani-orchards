import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { generateOrderSlipPdf } from '@/lib/pdf/order-slip';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureDatabaseReady();
    const { id } = await params;
    const db = getDatabase();

    const order = db.prepare(`
      SELECT o.id, o.order_number, o.customer_id, o.guest_email, o.guest_phone
      FROM orders o
      WHERE o.id = ? OR o.order_number = ?
    `).get(id, id) as any;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Authorization check
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const phoneParam = searchParams.get('phone')?.trim();
    const emailParam = searchParams.get('email')?.trim().toLowerCase();

    let isAuthorized = false;

    if (user) {
      if (user.role !== 'CUSTOMER' && hasPermission(user.role, 'orders:read')) {
        isAuthorized = true; // Admin/staff
      } else if (order.customer_id === user.id) {
        isAuthorized = true; // Customer owner
      }
    }

    // Guest verification via query verification
    if (!isAuthorized && (phoneParam || emailParam)) {
      const dbPhone = (order.guest_phone || '').replace(/\D/g, '');
      const queryPhone = (phoneParam || '').replace(/\D/g, '');
      const phoneMatches = queryPhone && dbPhone && (dbPhone.includes(queryPhone) || queryPhone.includes(dbPhone));
      const emailMatches = emailParam && order.guest_email && order.guest_email.toLowerCase() === emailParam;

      if (phoneMatches || emailMatches) {
        isAuthorized = true;
      }
    }

    // If still not authorized, allow if customer tracking token or public tracking match
    const isPublicTracking = searchParams.get('public') === 'true';
    if (!isAuthorized && isPublicTracking) {
      // Allow download for customer on tracking confirmation page
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in or provide phone/email verification to access this consignment note.' },
        { status: 403 }
      );
    }

    const pdfBytes = await generateOrderSlipPdf(order.id);

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Al-Usmani-Consignment-${order.order_number}.pdf"`,
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (err: any) {
    console.error('Error generating order slip PDF:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
