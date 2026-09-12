/**
 * Canonical Pricing Service for Al Usmani Orchards Platform.
 * 
 * Provides centralized, authoritative business logic for:
 * - Base Price (regular catalog price)
 * - Sale Price (promotional retail price)
 * - Pre-Order Price (early-bird reservation rate)
 * - Wholesale Price (B2B bulk volume rate)
 * - Effective Price (the authoritative price customers and admins currently see)
 */

export interface PriceableItem {
  base_price?: number | string | null;
  regular_price?: number | string | null;
  sale_price?: number | string | null;
  preorder_price?: number | string | null;
  wholesale_price?: number | string | null;
  effective_price?: number | string | null;
}

export interface PricingContext {
  isPreorder?: boolean;
  isWholesale?: boolean;
  quantity?: number;
}

/**
 * Safely parses any value into a finite number, or null if invalid/unavailable.
 */
export function parseNumericPrice(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || isNaN(num) || num < 0) return null;
  return Math.round(num * 100) / 100;
}

/**
 * Authoritative canonical function to compute the effective price of a package.
 * 
 * Business Rules:
 * 1. If context is 'isPreorder' and valid preorder_price exists, use preorder_price.
 * 2. If context is 'isWholesale' (e.g. >= 20 units or B2B) and valid wholesale_price exists, use wholesale_price.
 * 3. If sale_price is set, positive, and strictly lower than base_price, use sale_price.
 * 4. Otherwise, use base_price (or regular_price fallback).
 * 5. If no valid price can be derived, returns null (never undefined).
 */
export function getEffectivePrice(
  itemOrBase: PriceableItem | unknown,
  contextOrSale?: PricingContext | unknown,
  preorderPriceArg?: unknown,
  contextArg?: PricingContext | null
): number | null {
  if (itemOrBase === null || itemOrBase === undefined) return null;

  // Detect whether caller passed an object (PriceableItem) or raw scalar values
  if (typeof itemOrBase === 'object' && itemOrBase !== null) {
    const item = itemOrBase as PriceableItem;
    const ctx: PricingContext =
      typeof contextOrSale === 'object' && contextOrSale !== null
        ? (contextOrSale as PricingContext)
        : {};

    const basePrice = parseNumericPrice(item.base_price ?? item.regular_price);
    const salePrice = parseNumericPrice(item.sale_price);
    const preorderPrice = parseNumericPrice(item.preorder_price);
    const wholesalePrice = parseNumericPrice(item.wholesale_price);

    // 1. Pre-order campaign priority
    if (ctx.isPreorder && preorderPrice !== null) {
      return preorderPrice;
    }

    // 2. Wholesale / B2B priority
    if (ctx.isWholesale && wholesalePrice !== null) {
      return wholesalePrice;
    }

    // 3. Active promotional sale price (must be valid and lower than base price)
    if (salePrice !== null && (basePrice === null || salePrice < basePrice)) {
      return salePrice;
    }

    // 4. Standard base price
    if (basePrice !== null) {
      return basePrice;
    }

    // 5. Fallback to preorder price if item only has preorder pricing configured
    if (preorderPrice !== null) {
      return preorderPrice;
    }

    // 6. Explicitly unavailable
    return null;
  }

  // Scalar arguments: getEffectivePrice(basePrice, salePrice, preorderPrice, context)
  const basePrice = parseNumericPrice(itemOrBase);
  const salePrice = parseNumericPrice(contextOrSale);
  const preorderPrice = parseNumericPrice(preorderPriceArg);
  const ctx: PricingContext =
    typeof contextArg === 'object' && contextArg !== null ? contextArg : {};

  if (ctx.isPreorder && preorderPrice !== null) {
    return preorderPrice;
  }
  if (preorderPrice !== null) {
    return preorderPrice;
  }
  if (salePrice !== null && (basePrice === null || salePrice < basePrice)) {
    return salePrice;
  }
  if (basePrice !== null) {
    return basePrice;
  }

  return null;
}

/**
 * Calculates the exact savings between regular price and effective price.
 */
export function calculateSavings(
  basePrice: number | null,
  effectivePrice: number | null
): {
  savingsAmount: number;
  savingsPercent: number;
  discountAmount: number;
  discountPercent: number;
  hasDiscount: boolean;
} {
  if (basePrice === null || effectivePrice === null || effectivePrice >= basePrice) {
    return {
      savingsAmount: 0,
      savingsPercent: 0,
      discountAmount: 0,
      discountPercent: 0,
      hasDiscount: false
    };
  }
  const diff = basePrice - effectivePrice;
  const percent = Math.round((diff / basePrice) * 100);
  return {
    savingsAmount: diff,
    savingsPercent: percent,
    discountAmount: diff,
    discountPercent: percent,
    hasDiscount: true
  };
}
