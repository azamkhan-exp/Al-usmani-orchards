import React from 'react';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import StoreClientWrapper from '@/components/store/StoreClientWrapper';
import { getPublicStoreSettings } from '@/lib/services/settings.service';
import {
  serializeVarieties,
  serializeProducts,
  serializePreorderCampaigns
} from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  ensureDatabaseReady();
  const db = getDatabase();
  const settings = await getPublicStoreSettings();

  // 1. Fetch varieties
  const rawVarieties = await db.prepare(`
    SELECT * FROM mango_varieties
    WHERE is_active = 1
    ORDER BY sort_order ASC, sweetness_brix DESC
  `).all();
  const varieties = serializeVarieties(rawVarieties);

  // 2. Fetch products with package sizes and live stock
  const rawProducts = await db.prepare(`
    SELECT 
      p.*,
      v.name as variety_name,
      v.slug as variety_slug,
      v.origin_city,
      v.sweetness_brix,
      v.aroma_level,
      v.fiber_level,
      v.acidity_level,
      v.flavor_notes
    FROM products p
    JOIN mango_varieties v ON v.id = p.variety_id
    WHERE p.status = 'ACTIVE'
    ORDER BY p.is_featured DESC, p.created_at ASC
  `).all();

  const allPackages = await db.prepare(`
    SELECT 
      ps.*,
      COALESCE(ps.sale_price, ps.base_price) as effective_price,
      COALESCE(inv.available_stock, 0) as available_stock,
      COALESCE(inv.total_stock, 0) as total_stock
    FROM package_sizes ps
    LEFT JOIN inventory inv ON inv.package_size_id = ps.id
    WHERE ps.is_active = 1
    ORDER BY ps.weight_kg ASC
  `).all();

  const packagesByProduct = new Map<string, any[]>();
  for (const pkg of (allPackages || [])) {
    const list = packagesByProduct.get(pkg.product_id) || [];
    list.push(pkg);
    packagesByProduct.set(pkg.product_id, list);
  }

  const products = serializeProducts(rawProducts, (productId) => packagesByProduct.get(productId) || []);

  // 3. Fetch pre-order campaigns
  const rawCampaigns = await db.prepare(`
    SELECT 
      c.*,
      p.name as product_name,
      ps.name as package_name,
      ps.weight_kg
    FROM preorder_campaigns c
    JOIN products p ON p.id = c.product_id
    JOIN package_sizes ps ON ps.id = c.package_size_id
    WHERE c.status IN ('ACTIVE', 'HARVEST_READY')
    ORDER BY c.expected_dispatch_date ASC
  `).all();
  const campaigns = serializePreorderCampaigns(rawCampaigns);

  return (
    <StoreClientWrapper
      varieties={varieties}
      products={products}
      campaigns={campaigns}
      settings={settings}
    />
  );
}
