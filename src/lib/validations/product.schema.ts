import { z } from 'zod';

export const ProductPackageSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  name: z.string().min(1, 'Package name is required'),
  weight_kg: z.number().positive('Weight must be positive'),
  base_price: z.number().nonnegative('Base price cannot be negative'),
  regular_price: z.number().nonnegative(),
  sale_price: z.number().nonnegative().nullable(),
  preorder_price: z.number().nonnegative().nullable(),
  wholesale_price: z.number().nonnegative().nullable(),
  effective_price: z.number().nonnegative().nullable(), // Explicitly nullable, never undefined
  available_stock: z.number().int().nonnegative(),
  reserved_stock: z.number().int().nonnegative().default(0),
  total_stock: z.number().int().nonnegative().default(0),
  sold_stock: z.number().int().nonnegative().default(0),
  sku: z.string().default(''),
  is_active: z.boolean().default(true)
});

export const ProductSchema = z.object({
  id: z.string(),
  variety_id: z.string(),
  variety_name: z.string(),
  variety_slug: z.string().default(''),
  origin_city: z.string().default('Multan'),
  sweetness_brix: z.number().default(22),
  aroma_level: z.number().default(8),
  fiber_level: z.number().default(2),
  acidity_level: z.number().default(2),
  flavor_notes: z.string().default(''),
  name: z.string().min(1, 'Product name is required'),
  slug: z.string(),
  tagline: z.string().default(''),
  description: z.string(),
  grade: z.string().default('Export Grade A+'),
  harvest_season: z.string().default('June - August'),
  is_featured: z.boolean().default(false),
  is_preorder_active: z.boolean().default(false),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'SEASONAL', 'PREORDER']).or(z.string()),
  primary_image: z.string(),
  packages: z.array(ProductPackageSchema).default([]),
  averageRating: z.number().default(5.0),
  reviewCount: z.number().default(4)
});

export const PreorderCampaignSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  product_id: z.string(),
  package_size_id: z.string(),
  regular_price: z.number().nonnegative(),
  preorder_price: z.number().nonnegative(),
  deposit_amount: z.number().nonnegative(),
  min_qty: z.number().int().positive().default(1),
  max_qty: z.number().int().positive().default(20),
  total_capacity: z.number().int().positive(),
  reserved_count: z.number().int().nonnegative().default(0),
  start_date: z.string(),
  end_date: z.string(),
  expected_harvest_date: z.string(),
  expected_dispatch_date: z.string(),
  estimated_delivery_date: z.string(),
  status: z.string().default('ACTIVE'),
  customer_terms: z.string().default(''),
  banner_image: z.string().default(''),
  created_at: z.string(),
  product_name: z.string(),
  package_name: z.string(),
  weight_kg: z.number().positive()
});
