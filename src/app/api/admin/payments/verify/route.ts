import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';
import { verifyManualPayment, getPendingVerificationPayments } from '@/lib/services/payment.service';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { transaction_id, approved, notes } = body;

    if (!transaction_id || typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Transaction ID and approval status (boolean) are required.' },
        { status: 400 }
      );
    }

    const success = await verifyManualPayment(transaction_id, user.id, approved, notes);
    if (!success) {
      return NextResponse.json({ error: 'Transaction not found or could not be updated.' }, { status: 404 });
    }

    const pending = await getPendingVerificationPayments();

    return NextResponse.json({
      success: true,
      message: approved ? 'Payment verified and marked as PAID.' : 'Payment rejected.',
      pending_verifications: pending
    });
  } catch (err: any) {
    console.error('Verify payment error:', err);
    return NextResponse.json({ error: 'Failed to verify payment transaction.' }, { status: 500 });
  }
}
