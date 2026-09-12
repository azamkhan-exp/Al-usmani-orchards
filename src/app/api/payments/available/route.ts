import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/db/init';
import { determineAvailablePaymentMethods } from '@/lib/services/payment.service';

export async function GET(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const { searchParams } = new URL(req.url);
    const productIdsParam = searchParams.get('product_ids');
    const productIds = productIdsParam ? productIdsParam.split(',').filter(Boolean) : [];

    const availableMethods = determineAvailablePaymentMethods(productIds);
    return NextResponse.json({
      success: true,
      methods: availableMethods
    });
  } catch (err: any) {
    console.error('Failed to get available payment methods:', err);
    return NextResponse.json({ error: 'Failed to retrieve available payment methods.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const body = await req.json().catch(() => ({}));
    const productIds = Array.isArray(body.product_ids) ? body.product_ids : [];

    const availableMethods = determineAvailablePaymentMethods(productIds);
    return NextResponse.json({
      success: true,
      methods: availableMethods
    });
  } catch (err: any) {
    console.error('Failed to get available payment methods:', err);
    return NextResponse.json({ error: 'Failed to retrieve available payment methods.' }, { status: 500 });
  }
}
