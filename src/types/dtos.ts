/**
 * Data Transfer Objects (DTOs) for Server Component -> Client Component boundary.
 * 
 * In Next.js 15+ / 16.3.4+ (React 19) with Turbopack, props passed across the RSC Flight
 * serialization boundary must be strictly plain objects whose prototype is Object.prototype.
 * Classes, null prototypes (e.g. raw rows from node:sqlite or other database drivers),
 * Date instances, and Decimal instances are rejected with:
 * "Only plain objects, and a few built-ins, can be passed to Client Components from Server Components. Classes or null prototypes are not supported."
 */

export interface PreorderCampaignDTO {
  id: string;
  title: string;
  slug: string;
  product_id: string;
  package_size_id: string;
  regular_price: number;
  preorder_price: number;
  deposit_amount: number;
  min_qty: number;
  max_qty: number;
  total_capacity: number;
  reserved_count: number;
  start_date: string;
  end_date: string;
  expected_harvest_date: string;
  expected_dispatch_date: string;
  estimated_delivery_date: string;
  status: string;
  customer_terms: string;
  banner_image: string;
  created_at: string;
  product_name: string;
  package_name: string;
  weight_kg: number;
}

export interface PackageSizeDTO {
  id: string;
  product_id: string;
  name: string;
  weight_kg: number;
  base_price: number;
  regular_price: number;
  sale_price: number | null;
  preorder_price: number | null;
  wholesale_price: number | null;
  effective_price: number | null; // Strictly number | null, NEVER undefined!
  available_stock: number;
  reserved_stock: number;
  total_stock: number;
  sold_stock: number;
  sku: string;
  is_active: boolean;
}

export type ProductPackageDTO = PackageSizeDTO;

export type ProductStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'OUT_OF_STOCK'
  | 'SEASONAL'
  | 'PREORDER';

export interface ProductDTO {
  id: string;
  variety_id: string;
  variety_name: string;
  variety_slug: string;
  origin_city: string;
  sweetness_brix: number;
  aroma_level: number;
  fiber_level: number;
  acidity_level: number;
  flavor_notes: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  grade: string;
  harvest_season: string;
  is_featured: boolean;
  is_preorder_active: boolean;
  status: ProductStatus | string;
  primary_image: string;
  gallery?: string[];
  images?: ProductImageDTO[];
  packages: ProductPackageDTO[];
  averageRating: number;
  reviewCount: number;
}

export interface ProductImageDTO {
  id: string;
  product_id: string;
  image_url: string;
  storage_path?: string | null;
  alt_text?: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface VarietyDTO {
  id: string;
  name: string;
  slug: string;
  origin_city: string;
  harvest_start_month: number;
  harvest_end_month: number;
  sweetness_brix: number;
  aroma_level: number;
  fiber_level: number;
  acidity_level: number;
  description: string;
  flavor_notes: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
}

export interface CustomerDTO {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  segment: string;
  total_spent: number;
  orders_count: number;
  referral_code: string | null;
  created_at: string;
}

export interface CustomerAddressDTO {
  id: string;
  customer_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  street_address: string;
  area: string | null;
  city: string;
  province: string;
  postal_code: string | null;
  is_default: boolean;
}
