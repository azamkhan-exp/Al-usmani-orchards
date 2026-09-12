import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { evaluateOrderDiscounts, CartItemToEvaluate } from '@/lib/services/discount.service';
import { calculateShippingFee } from '@/lib/services/courier.service';

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const body = await req.json();
    const { items, couponCode, destinationCity, customerEmail } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        subtotal: 0,
        tieredDiscount: 0,
        couponDiscount: 0,
        totalDiscount: 0,
        shippingFee: 0,
        grandTotal: 0,
        appliedTierPercent: 0,
        errors: []
      });
    }

    const db = getDatabase();
    const evaluatedItems: CartItemToEvaluate[] = [];
    let totalWeightKg = 0;

    for (const item of items) {
      const pkg = db.prepare(`
        SELECT 
          ps.id, ps.weight_kg, COALESCE(ps.sale_price, ps.base_price) as price,
          p.id as product_id, p.variety_id
        FROM package_sizes ps
        JOIN products p ON p.id = ps.product_id
        WHERE ps.id = ? AND ps.is_active = 1
      `).get(item.packageSizeId) as any;

      if (!pkg) continue;

      evaluatedItems.push({
        packageSizeId: pkg.id,
        productId: pkg.product_id,
        varietyId: pkg.variety_id,
        quantity: item.quantity,
        unitPrice: pkg.price
      });

      totalWeightKg += pkg.weight_kg * item.quantity;
    }

    const discountResult = evaluateOrderDiscounts(evaluatedItems, couponCode, customerEmail);
    const shippingFee = calculateShippingFee(totalWeightKg, destinationCity || 'Lahore', discountResult.finalAmount);
    const grandTotal = Math.max(0, discountResult.finalAmount + shippingFee);

    return NextResponse.json({
      success: true,
      subtotal: discountResult.subtotal,
      tieredDiscount: discountResult.tieredDiscount,
      couponDiscount: discountResult.couponDiscount,
      totalDiscount: discountResult.totalDiscount,
      appliedTierPercent: discountResult.appliedTierPercent,
      shippingFee,
      grandTotal,
      totalWeightKg,
      couponDetails: discountResult.couponDetails,
      errors: discountResult.errors
    });
  } catch (err: any) {
    console.error('Cart calculation error:', err);
    return NextResponse.json({ error: 'Failed to calculate cart' }, { status: 500 });
  }
}
