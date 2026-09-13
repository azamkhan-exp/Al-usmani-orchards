import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { createOrder, CheckoutRequest } from '@/lib/services/order.service';
import { getCurrentUser } from '@/lib/auth/session';
import { generateOrderSlipToken } from '@/lib/pdf/tokens';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const body = await req.json();
    const user = await getCurrentUser();

    const checkoutData: CheckoutRequest = {
      items: body.items,
      customer: body.customer,
      couponCode: body.couponCode,
      paymentMethod: body.paymentMethod || 'COD',
      paymentReference: body.paymentReference || body.transactionReference || body.tid,
      isGift: Boolean(body.isGift),
      giftRecipient: body.giftRecipient,
      giftMessage: body.giftMessage,
      customerNotes: body.customerNotes,
      userId: user?.id
    };

    console.log(`[CHECKOUT] Processing checkout request for ${body.customer?.email || 'guest'} (User: ${user?.id || 'guest'})`);
    const result = await createOrder(checkoutData);

    if (!result.success) {
      console.warn(`[CHECKOUT] Order creation failed: ${result.error}`);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to place order.',
          code: 'ORDER_CREATION_FAILED'
        },
        { status: 400 }
      );
    }

    console.log(`[CHECKOUT] Successfully placed order ${result.orderNumber} (ID: ${result.orderId}) for PKR ${result.totalAmount}`);

    // Generate a cryptographic HMAC slip token so the checkout confirmation page
    // can show a download link without requiring re-authentication.
    let slipToken: string | undefined;
    try {
      const db = getDatabase();
      const orderRow = (await db.prepare(
        'SELECT created_at FROM orders WHERE id = $1'
      ).get(result.orderId)) as any;

      if (orderRow?.created_at) {
        const createdAt =
          typeof orderRow.created_at === 'string'
            ? orderRow.created_at
            : new Date(orderRow.created_at).toISOString();
        slipToken = generateOrderSlipToken(result.orderId!, result.orderNumber!, createdAt);
      }
    } catch (tokenErr) {
      // Non-fatal — slip token is a convenience; the PDF route still works
      // via session-based auth or guest contact verification.
      console.warn('[CHECKOUT] Failed to generate slip token (non-fatal):', tokenErr);
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      totalAmount: result.totalAmount,
      slipToken
    });
  } catch (err: any) {
    console.error('[CHECKOUT] Checkout exception:', err.message || err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Checkout failed.',
        code: 'CHECKOUT_INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
