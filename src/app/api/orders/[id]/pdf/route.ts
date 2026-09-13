import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { generateOrderSlipPdf } from '@/lib/pdf/order-slip';
import { verifyOrderSlipToken } from '@/lib/pdf/tokens';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureDatabaseReady();
    const { id } = await params;
    const db = getDatabase();

    // Fetch the order with its created_at for token verification
    const order = (await db.prepare(`
      SELECT o.id, o.order_number, o.customer_id, o.guest_email, o.guest_phone, o.created_at
      FROM orders o
      WHERE o.id = $1 OR o.order_number = $1
    `).get(id)) as any;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const phoneParam = searchParams.get('phone')?.trim();
    const emailParam = searchParams.get('email')?.trim().toLowerCase();
    const tokenParam = searchParams.get('token')?.trim();
    const wantsDownload =
      searchParams.get('download') === 'true' ||
      searchParams.get('download') === '1' ||
      searchParams.get('dl') === '1';

    let isAuthorized = false;
    let authMethod = 'none';

    // ── 1. Authenticated admin / staff ─────────────────────────────────────
    const user = await getCurrentUser();
    if (user) {
      if (user.role !== 'CUSTOMER' && hasPermission(user.role, 'orders:read')) {
        isAuthorized = true;
        authMethod = 'admin';
      } else if (user.role === 'CUSTOMER' && order.customer_id) {
        // CRITICAL FIX: user.id is from the `users` table.
        // order.customer_id is from the `customers` table (different UUID).
        // We must resolve the customer profile via user_id or email.
        const customerProfile = (await db.prepare(`
          SELECT id FROM customers
          WHERE user_id = $1 OR LOWER(email) = LOWER($2)
          LIMIT 1
        `).get(user.id, user.email || '')) as any;

        if (customerProfile && customerProfile.id === order.customer_id) {
          isAuthorized = true;
          authMethod = 'customer-session';
        }
      }
    }

    // ── 2. HMAC slip token (replaces the insecure ?public=true bypass) ─────
    // Token is issued on checkout success and order-tracking API responses.
    // It cryptographically binds the token to this specific order.
    if (!isAuthorized && tokenParam) {
      const createdAt = typeof order.created_at === 'string'
        ? order.created_at
        : new Date(order.created_at).toISOString();

      if (verifyOrderSlipToken(tokenParam, order.id, order.order_number, createdAt)) {
        isAuthorized = true;
        authMethod = 'slip-token';
      }
    }

    // ── 3. Guest verification via contact details ──────────────────────────
    // Applies to guest orders (no customer_id) where the caller provides the
    // exact phone or email used at checkout.
    if (!isAuthorized && (phoneParam || emailParam)) {
      const dbPhone = (order.guest_phone || '').replace(/\D/g, '');
      const queryPhone = (phoneParam || '').replace(/\D/g, '');
      const phoneMatches = Boolean(
        queryPhone && dbPhone && (dbPhone.includes(queryPhone) || queryPhone.includes(dbPhone))
      );
      const emailMatches = Boolean(
        emailParam && order.guest_email && order.guest_email.toLowerCase() === emailParam
      );

      if (phoneMatches || emailMatches) {
        isAuthorized = true;
        authMethod = 'guest-contact';
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error:
            'Unauthorized. Please sign in or provide phone/email verification to access this consignment note.'
        },
        { status: 403 }
      );
    }

    console.log(
      `[PDF] Serving consignment ${order.order_number} — auth method: ${authMethod}`
    );

    const pdfBytes = await generateOrderSlipPdf(order.id);
    const dispositionType = wantsDownload ? 'attachment' : 'inline';

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${dispositionType}; filename="Al-Usmani-Consignment-${order.order_number}.pdf"`,
        'Content-Length': String(pdfBytes.byteLength),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (err: any) {
    console.error('Error generating order slip PDF:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
