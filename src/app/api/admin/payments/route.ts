import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getAllPaymentMethods,
  updatePaymentMethod,
  getPendingVerificationPayments
} from '@/lib/services/payment.service';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const methods = getAllPaymentMethods(false);
    const pendingTransactions = getPendingVerificationPayments();

    return NextResponse.json({
      success: true,
      methods,
      pending_verifications: pendingTransactions
    });
  } catch (err: any) {
    console.error('Failed to get payment methods:', err);
    return NextResponse.json({ error: 'Failed to retrieve payment methods.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { code, is_enabled, configs } = body;

    if (!code) {
      return NextResponse.json({ error: 'Payment method code is required.' }, { status: 400 });
    }

    const updated = updatePaymentMethod(code, !!is_enabled, configs, user.id);
    if (!updated) {
      return NextResponse.json({ error: 'Payment method not found.' }, { status: 404 });
    }

    const allMethods = getAllPaymentMethods(false);
    return NextResponse.json({
      success: true,
      message: `Payment method ${code} updated successfully.`,
      methods: allMethods
    });
  } catch (err: any) {
    console.error('Failed to update payment method:', err);
    return NextResponse.json({ error: 'Failed to update payment method.' }, { status: 500 });
  }
}
