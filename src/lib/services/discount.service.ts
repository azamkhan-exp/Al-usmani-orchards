import { getDatabase } from '../db';
import { formatPKR } from '../formatters';

export interface CartItemToEvaluate {
  packageSizeId: string;
  productId: string;
  varietyId: string;
  quantity: number;
  unitPrice: number;
}

export interface DiscountEvaluationResult {
  subtotal: number;
  tieredDiscount: number;
  couponDiscount: number;
  totalDiscount: number;
  finalAmount: number;
  appliedTierPercent: number;
  couponDetails?: {
    code: string;
    name: string;
    discountType: string;
    value: number;
  };
  errors: string[];
}

export function evaluateOrderDiscounts(
  items: CartItemToEvaluate[],
  couponCode?: string | null,
  customerEmail?: string | null
): DiscountEvaluationResult {
  const db = getDatabase();
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalBoxes = items.reduce((sum, item) => sum + item.quantity, 0);

  let tieredDiscount = 0;
  let appliedTierPercent = 0;
  let couponDiscount = 0;
  const errors: string[] = [];
  let couponDetails: DiscountEvaluationResult['couponDetails'];

  // 1. Check Automatic Tiered Volume Discounts
  // Example rule: 5-9 boxes = 5%, 10-19 boxes = 10%, 20+ boxes = 15%
  const tieredPromo = db.prepare(`
    SELECT p.id, p.name 
    FROM promotions p
    WHERE p.discount_type = 'TIERED' AND p.is_active = 1
    ORDER BY p.created_at DESC LIMIT 1
  `).get() as { id: string; name: string } | undefined;

  if (tieredPromo) {
    const rules = db.prepare(`
      SELECT min_units, max_units, discount_percentage
      FROM tiered_discount_rules
      WHERE promotion_id = ?
      ORDER BY min_units DESC
    `).all(tieredPromo.id) as Array<{ min_units: number; max_units: number | null; discount_percentage: number }>;

    for (const rule of rules) {
      if (totalBoxes >= rule.min_units && (rule.max_units === null || totalBoxes <= rule.max_units)) {
        appliedTierPercent = rule.discount_percentage;
        tieredDiscount = Math.round((subtotal * appliedTierPercent) / 100);
        break;
      }
    }
  } else {
    // Fallback standard tiered breaks if not yet configured in DB
    if (totalBoxes >= 20) {
      appliedTierPercent = 15;
    } else if (totalBoxes >= 10) {
      appliedTierPercent = 10;
    } else if (totalBoxes >= 5) {
      appliedTierPercent = 5;
    }
    if (appliedTierPercent > 0) {
      tieredDiscount = Math.round((subtotal * appliedTierPercent) / 100);
    }
  }

  // 2. Validate Coupon Code (if provided)
  if (couponCode && couponCode.trim()) {
    const cleanCode = couponCode.trim().toUpperCase();
    const promo = db.prepare(`
      SELECT * FROM promotions 
      WHERE UPPER(code) = ? AND is_active = 1
    `).get(cleanCode) as any;

    if (!promo) {
      errors.push(`Coupon '${cleanCode}' is invalid or expired.`);
    } else {
      // Check expiration date
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        errors.push(`Coupon '${cleanCode}' has expired.`);
      }
      // Check minimum order value
      else if (subtotal < promo.min_order_value) {
        errors.push(`Coupon requires a minimum order of ${formatPKR(promo.min_order_value)}.`);
      }
      // Check total usage limit
      else if (promo.usage_limit && promo.times_used >= promo.usage_limit) {
        errors.push(`Coupon '${cleanCode}' has reached its maximum usage limit.`);
      }
      else {
        // Calculate coupon discount
        if (promo.discount_type === 'PERCENTAGE') {
          couponDiscount = Math.round((subtotal * promo.discount_value) / 100);
          if (promo.max_discount && couponDiscount > promo.max_discount) {
            couponDiscount = promo.max_discount;
          }
        } else if (promo.discount_type === 'FIXED') {
          couponDiscount = Math.min(promo.discount_value, subtotal);
        }

        couponDetails = {
          code: promo.code,
          name: promo.name,
          discountType: promo.discount_type,
          value: promo.discount_value
        };
      }
    }
  }

  const totalDiscount = tieredDiscount + couponDiscount;
  const finalAmount = Math.max(0, subtotal - totalDiscount);

  return {
    subtotal,
    tieredDiscount,
    couponDiscount,
    totalDiscount,
    finalAmount,
    appliedTierPercent,
    couponDetails,
    errors
  };
}
