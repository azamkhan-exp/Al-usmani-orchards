import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { assignCourierAndDispatch } from '@/lib/services/courier.service';
import { recordAuditLog } from '@/lib/services/audit.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'shipping:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: orderId } = await params;
    const body = await req.json();
    const { courierId, shippingCost } = body;

    if (!courierId) {
      return NextResponse.json({ error: 'Courier selection is required.' }, { status: 400 });
    }

    const result = await assignCourierAndDispatch({
      orderId,
      courierId,
      shippingCost: shippingCost || 350,
      codAmount: body.codAmount || 0,
      createdBy: user.name
    });

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'ORDER_DISPATCHED',
      resourceType: 'SHIPMENT',
      resourceId: result.shipmentId,
      newState: { orderId, courierId, trackingNumber: result.trackingNumber }
    });

    console.log(`[DISPATCH] Successfully dispatched order ${orderId} via courier ${courierId} with tracking #${result.trackingNumber}`);

    return NextResponse.json({
      success: true,
      shipmentId: result.shipmentId,
      trackingNumber: result.trackingNumber
    });
  } catch (err: any) {
    console.error('[DISPATCH] Error dispatching order:', err.message || err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to dispatch order',
        code: 'DISPATCH_ERROR'
      },
      { status: 400 }
    );
  }
}
