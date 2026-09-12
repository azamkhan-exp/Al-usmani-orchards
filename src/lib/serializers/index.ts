import {
  PreorderCampaignDTO,
  PackageSizeDTO,
  ProductPackageDTO,
  ProductDTO,
  VarietyDTO
} from '@/types/dtos';
import { getEffectivePrice } from '@/lib/pricing';

/**
 * Primitive conversion utilities ensuring strictly primitive types
 * and eliminating Date instances, Decimals, BigInts, or un-serializable symbols.
 */
export function toPlainString(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

export function toPlainNumber(val: unknown, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

export function toNullableNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

export function toPlainBoolean(val: unknown): boolean {
  if (val === 1 || val === '1' || val === true || val === 'true') return true;
  return false;
}

/**
 * Validates at runtime that an object has Object.prototype as its prototype,
 * ensuring it will pass React Server Components (Flight) serialization without error.
 */
export function assertPlainObject<T extends object>(obj: T, context = 'DTO'): T {
  if (process.env.NODE_ENV !== 'production') {
    if (typeof obj !== 'object' || obj === null) {
      throw new TypeError(`[${context}] Expected an object, got ${typeof obj}`);
    }
    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype) {
      throw new TypeError(
        `[${context}] Object must be a plain object with Object.prototype. Found: ${proto === null ? 'null prototype' : proto.constructor?.name}`
      );
    }
  }
  return obj;
}

/**
 * Serializes a raw database record into a plain PreorderCampaignDTO.
 * Guaranteed to have Object.prototype and strictly primitive values.
 */
export function serializePreorderCampaign(raw: Record<string, any>): PreorderCampaignDTO {
  const regularPrice = toPlainNumber(raw.regular_price ?? raw.base_price);
  const preorderPrice = toPlainNumber(raw.preorder_price ?? raw.regular_price);

  const dto: PreorderCampaignDTO = {
    id: toPlainString(raw.id),
    title: toPlainString(raw.title),
    slug: toPlainString(raw.slug),
    product_id: toPlainString(raw.product_id),
    package_size_id: toPlainString(raw.package_size_id),
    regular_price: regularPrice,
    preorder_price: preorderPrice,
    deposit_amount: toPlainNumber(raw.deposit_amount),
    min_qty: toPlainNumber(raw.min_qty, 1),
    max_qty: toPlainNumber(raw.max_qty, 20),
    total_capacity: toPlainNumber(raw.total_capacity),
    reserved_count: toPlainNumber(raw.reserved_count, 0),
    start_date: toPlainString(raw.start_date),
    end_date: toPlainString(raw.end_date),
    expected_harvest_date: toPlainString(raw.expected_harvest_date),
    expected_dispatch_date: toPlainString(raw.expected_dispatch_date),
    estimated_delivery_date: toPlainString(raw.estimated_delivery_date),
    status: toPlainString(raw.status, 'ACTIVE'),
    customer_terms: toPlainString(raw.customer_terms),
    banner_image: toPlainString(raw.banner_image),
    created_at: toPlainString(raw.created_at),
    product_name: toPlainString(raw.product_name),
    package_name: toPlainString(raw.package_name),
    weight_kg: toPlainNumber(raw.weight_kg)
  };

  return assertPlainObject(dto, 'PreorderCampaignDTO');
}

/**
 * Serializes an array of raw preorder campaign records.
 */
export function serializePreorderCampaigns(rawRows: unknown[]): PreorderCampaignDTO[] {
  if (!Array.isArray(rawRows)) return [];
  return rawRows.map((row) => serializePreorderCampaign(row as Record<string, any>));
}

/**
 * Normalizes a raw database package size record into a plain ProductPackageDTO.
 * 
 * Guarantee: effective_price is NEVER undefined. It is always number | null.
 */
export function normalizePackage(raw: Record<string, any> | null | undefined): ProductPackageDTO {
  if (!raw) {
    return {
      id: '',
      product_id: '',
      name: 'Unknown Package',
      weight_kg: 0,
      base_price: 0,
      regular_price: 0,
      sale_price: null,
      preorder_price: null,
      wholesale_price: null,
      effective_price: null,
      available_stock: 0,
      reserved_stock: 0,
      total_stock: 0,
      sold_stock: 0,
      sku: '',
      is_active: false
    };
  }

  const basePrice = toPlainNumber(raw.base_price ?? raw.regular_price);
  const effectivePrice = getEffectivePrice(raw);

  const dto: ProductPackageDTO = {
    id: toPlainString(raw.id),
    product_id: toPlainString(raw.product_id),
    name: toPlainString(raw.name),
    weight_kg: toPlainNumber(raw.weight_kg),
    base_price: basePrice,
    regular_price: basePrice,
    sale_price: toNullableNumber(raw.sale_price),
    preorder_price: toNullableNumber(raw.preorder_price),
    wholesale_price: toNullableNumber(raw.wholesale_price),
    effective_price: effectivePrice,
    available_stock: toPlainNumber(raw.available_stock, 0),
    reserved_stock: toPlainNumber(raw.reserved_stock, 0),
    total_stock: toPlainNumber(raw.total_stock, 0),
    sold_stock: toPlainNumber(raw.sold_stock, 0),
    sku: toPlainString(raw.sku),
    is_active: toPlainBoolean(raw.is_active ?? 1)
  };

  return assertPlainObject(dto, 'ProductPackageDTO');
}

export const serializePackageSize = normalizePackage;

export function normalizePackages(rawRows: unknown[]): ProductPackageDTO[] {
  if (!Array.isArray(rawRows)) return [];
  return rawRows.map((row) => normalizePackage(row as Record<string, any>));
}

/**
 * Normalizes a raw product record along with its associated package sizes.
 */
export function normalizeProduct(
  raw: Record<string, any>,
  rawPackages: Record<string, any>[] = []
): ProductDTO {
  const packages = Array.isArray(rawPackages)
    ? rawPackages.map((pkg) => normalizePackage(pkg))
    : [];

  const dto: ProductDTO = {
    id: toPlainString(raw.id),
    variety_id: toPlainString(raw.variety_id),
    variety_name: toPlainString(raw.variety_name),
    variety_slug: toPlainString(raw.variety_slug),
    origin_city: toPlainString(raw.origin_city),
    sweetness_brix: toPlainNumber(raw.sweetness_brix),
    aroma_level: toPlainNumber(raw.aroma_level),
    fiber_level: toPlainNumber(raw.fiber_level),
    acidity_level: toPlainNumber(raw.acidity_level),
    flavor_notes: toPlainString(raw.flavor_notes),
    name: toPlainString(raw.name),
    slug: toPlainString(raw.slug),
    tagline: toPlainString(raw.tagline),
    description: toPlainString(raw.description),
    grade: toPlainString(raw.grade, 'Export Grade A+'),
    harvest_season: toPlainString(raw.harvest_season),
    is_featured: toPlainBoolean(raw.is_featured),
    is_preorder_active: toPlainBoolean(raw.is_preorder_active),
    status: toPlainString(raw.status, 'ACTIVE'),
    primary_image: toPlainString(raw.primary_image),
    gallery: (() => {
      try {
        const parsed = JSON.parse(raw.gallery_json || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),
    packages,
    averageRating: toPlainNumber(raw.averageRating, 5.0),
    reviewCount: toPlainNumber(raw.reviewCount, 4)
  };

  return assertPlainObject(dto, 'ProductDTO');
}

export const serializeProduct = normalizeProduct;

/**
 * Serializes an array of raw product records using a package size getter.
 */
export function serializeProducts(
  rawProducts: unknown[],
  getPackageSizesFn: (productId: string) => unknown[]
): ProductDTO[] {
  if (!Array.isArray(rawProducts)) return [];
  return rawProducts.map((rawProd) => {
    const prodObj = rawProd as Record<string, any>;
    const rawPkgs = getPackageSizesFn(prodObj.id) as Record<string, any>[];
    return normalizeProduct(prodObj, rawPkgs);
  });
}

export const normalizeProducts = serializeProducts;

/**
 * Serializes a raw mango variety record into a plain VarietyDTO.
 */
export function serializeVariety(raw: Record<string, any>): VarietyDTO {
  const dto: VarietyDTO = {
    id: toPlainString(raw.id),
    name: toPlainString(raw.name),
    slug: toPlainString(raw.slug),
    origin_city: toPlainString(raw.origin_city),
    harvest_start_month: toPlainNumber(raw.harvest_start_month),
    harvest_end_month: toPlainNumber(raw.harvest_end_month),
    sweetness_brix: toPlainNumber(raw.sweetness_brix),
    aroma_level: toPlainNumber(raw.aroma_level),
    fiber_level: toPlainNumber(raw.fiber_level),
    acidity_level: toPlainNumber(raw.acidity_level),
    description: toPlainString(raw.description),
    flavor_notes: toPlainString(raw.flavor_notes),
    image_url: toPlainString(raw.image_url),
    is_active: toPlainBoolean(raw.is_active ?? 1),
    sort_order: toPlainNumber(raw.sort_order, 0)
  };

  return assertPlainObject(dto, 'VarietyDTO');
}

/**
 * Serializes an array of raw mango variety records.
 */
export function serializeVarieties(rawRows: unknown[]): VarietyDTO[] {
  if (!Array.isArray(rawRows)) return [];
  return rawRows.map((row) => serializeVariety(row as Record<string, any>));
}
