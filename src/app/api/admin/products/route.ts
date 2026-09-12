import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, runTransaction } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { recordAuditLog } from '@/lib/services/audit.service';
import { normalizeProduct, normalizePackage, serializeVarieties } from '@/lib/serializers';
import { setProductPaymentOverride } from '@/lib/services/payment.service';
import crypto from 'node:crypto';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'products:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = getDatabase();

    const rawProducts = (await db.prepare(`
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
      ORDER BY p.is_featured DESC, p.created_at ASC
    `).all()) as any[];

    const getPackages = db.prepare(`
      SELECT 
        ps.*,
        inv.available_stock,
        inv.total_stock,
        inv.reserved_stock,
        inv.sold_stock,
        inv.low_stock_threshold
      FROM package_sizes ps
      LEFT JOIN inventory inv ON inv.package_size_id = ps.id
      WHERE ps.product_id = ?
      ORDER BY ps.weight_kg ASC
    `);

    const getPaymentOverrides = db.prepare(`
      SELECT payment_method_code, status
      FROM product_payment_methods
      WHERE product_id = ?
    `);

    // Strictly normalize every single product and package through our canonical DTO layer
    const products = await Promise.all(
      rawProducts.map(async (prod) => {
        const rawPackages = (await getPackages.all(prod.id)) as any[];
        const normalized = normalizeProduct(prod, rawPackages);
        (normalized as any).payment_method_overrides = await getPaymentOverrides.all(prod.id);
        return normalized;
      })
    );

    const rawVarieties = (await db.prepare('SELECT * FROM mango_varieties ORDER BY sort_order ASC').all()) as any[];
    const varieties = serializeVarieties(rawVarieties);

    return NextResponse.json({ success: true, products, varieties });
  } catch (err: any) {
    console.error('Admin products GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'products:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    const db = getDatabase();

    // 1. ADD NEW CATALOG PRODUCT
    if (action === 'ADD_PRODUCT') {
      const {
        varietyId,
        name,
        tagline,
        description,
        grade,
        harvestSeason,
        status,
        isFeatured,
        isPreorderActive,
        primaryImage,
        initialPackageName,
        initialWeightKg,
        initialBasePrice,
        initialStock
      } = body;

      if (!varietyId || !name || !description) {
        return NextResponse.json({ error: 'Variety, Name, and Description are required' }, { status: 400 });
      }

      const productId = crypto.randomUUID();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`;
      const prodStatus = status || 'ACTIVE';

      await runTransaction(async (database) => {
        await database.prepare(`
          INSERT INTO products (
            id, variety_id, name, slug, tagline, description, grade,
            harvest_season, status, is_featured, is_preorder_active,
            primary_image, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          productId,
          varietyId,
          name.trim(),
          slug,
          tagline || '',
          description.trim(),
          grade || 'Export Grade A+',
          harvestSeason || 'June - August',
          prodStatus,
          isFeatured ? 1 : 0,
          isPreorderActive ? 1 : 0,
          primaryImage || 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=80'
        );

        // Optionally create first package size
        if (initialPackageName && initialBasePrice) {
          const pkgId = crypto.randomUUID();
          const sku = `PKG-${Date.now().toString().slice(-6)}`;
          await database.prepare(`
            INSERT INTO package_sizes (
              id, product_id, name, weight_kg, base_price, sale_price,
              wholesale_price, sku, is_active, sort_order
            ) VALUES (?, ?, ?, ?, ?, null, ?, ?, 1, 0)
          `).run(
            pkgId,
            productId,
            initialPackageName,
            Number(initialWeightKg || 5),
            Number(initialBasePrice),
            Math.round(Number(initialBasePrice) * 0.85),
            sku
          );

          const stock = initialStock ? Number(initialStock) : 50;
          await database.prepare(`
            INSERT INTO inventory (id, package_size_id, total_stock, available_stock, low_stock_threshold)
            VALUES (?, ?, ?, ?, 10)
          `).run(crypto.randomUUID(), pkgId, stock, stock);
        }
      });

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'PRODUCT_CREATED',
        resourceType: 'PRODUCT',
        resourceId: productId,
        newState: { name, varietyId, status: prodStatus }
      });

      return NextResponse.json({ success: true, productId });
    }

    // 2. ADD NEW DYNAMIC PACKAGE SIZE
    if (action === 'ADD_PACKAGE_SIZE') {
      const { productId, name, weightKg, basePrice, salePrice, preorderPrice, initialStock } = body;
      if (!productId || !name || !weightKg || !basePrice) {
        return NextResponse.json({ error: 'Missing required package fields' }, { status: 400 });
      }

      const packageId = crypto.randomUUID();
      const sku = `PKG-${Date.now().toString().slice(-6)}`;

      await runTransaction(async (database) => {
        await database.prepare(`
          INSERT INTO package_sizes (
            id, product_id, name, weight_kg, base_price, sale_price,
            preorder_price, wholesale_price, sku, is_active, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
        `).run(
          packageId, productId, name, Number(weightKg), Number(basePrice),
          salePrice ? Number(salePrice) : null,
          preorderPrice ? Number(preorderPrice) : null,
          Math.round(Number(basePrice) * 0.85), sku
        );

        const stock = initialStock ? Number(initialStock) : 50;
        await database.prepare(`
          INSERT INTO inventory (id, package_size_id, total_stock, available_stock, low_stock_threshold)
          VALUES (?, ?, ?, ?, 10)
        `).run(crypto.randomUUID(), packageId, stock, stock);
      });

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'PACKAGE_SIZE_CREATED',
        resourceType: 'PACKAGE_SIZE',
        resourceId: packageId,
        newState: { productId, name, weightKg, basePrice }
      });

      return NextResponse.json({ success: true, packageId });
    }

    // 3. ADD NEW MANGO VARIETY
    if (action === 'ADD_VARIETY') {
      const { name, originCity, sweetnessBrix, aromaLevel, description } = body;
      const varietyId = crypto.randomUUID();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      await db.prepare(`
        INSERT INTO mango_varieties (
          id, name, slug, origin_city, harvest_start_month, harvest_end_month,
          sweetness_brix, aroma_level, fiber_level, acidity_level, description,
          image_url, is_active
        ) VALUES (?, ?, ?, ?, 6, 8, ?, ?, 2, 2, ?, 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=80', 1)
      `).run(varietyId, name, slug, originCity || 'Punjab', Number(sweetnessBrix || 22), Number(aromaLevel || 8), description || '');

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'VARIETY_CREATED',
        resourceType: 'MANGO_VARIETY',
        resourceId: varietyId,
        newState: { name, originCity, sweetnessBrix }
      });

      return NextResponse.json({ success: true, varietyId });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin products POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to perform operation' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'products:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    const db = getDatabase();

    // 1a. UPDATE MANGO VARIETY & PHOTO
    if (action === 'UPDATE_VARIETY') {
      const { id, name, imageUrl, originCity, sweetnessBrix, aromaLevel, description, flavorNotes } = body;
      if (!id) return NextResponse.json({ error: 'Variety ID required' }, { status: 400 });

      const existing = (await db.prepare('SELECT * FROM mango_varieties WHERE id = ?').get(id)) as any;
      if (!existing) return NextResponse.json({ error: 'Variety not found' }, { status: 404 });

      await db.prepare(`
        UPDATE mango_varieties
        SET
          name = COALESCE(?, name),
          image_url = COALESCE(?, image_url),
          origin_city = COALESCE(?, origin_city),
          sweetness_brix = COALESCE(?, sweetness_brix),
          aroma_level = COALESCE(?, aroma_level),
          description = COALESCE(?, description),
          flavor_notes = COALESCE(?, flavor_notes)
        WHERE id = ?
      `).run(
        name ?? null,
        imageUrl ?? null,
        originCity ?? null,
        sweetnessBrix !== undefined ? Number(sweetnessBrix) : null,
        aromaLevel !== undefined ? Number(aromaLevel) : null,
        description ?? null,
        flavorNotes ?? null,
        id
      );

      // If imageUrl is provided, also sync to primary_image of products associated with this variety
      if (imageUrl) {
        await db.prepare(`
          UPDATE products
          SET primary_image = ?, updated_at = CURRENT_TIMESTAMP
          WHERE variety_id = ?
        `).run(imageUrl, id);
      }

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'VARIETY_UPDATED',
        resourceType: 'VARIETY',
        resourceId: id,
        previousState: existing,
        newState: body
      });

      return NextResponse.json({ success: true, message: 'Variety and imagery updated successfully' });
    }

    // 1b. UPDATE CATALOG PRODUCT
    if (action === 'UPDATE_PRODUCT') {
      const { id, name, tagline, description, grade, harvestSeason, status, isFeatured, isPreorderActive, primaryImage } = body;
      if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

      const existing = (await db.prepare('SELECT * FROM products WHERE id = ?').get(id)) as any;
      if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

      await db.prepare(`
        UPDATE products
        SET
          name = COALESCE(?, name),
          tagline = COALESCE(?, tagline),
          description = COALESCE(?, description),
          grade = COALESCE(?, grade),
          harvest_season = COALESCE(?, harvest_season),
          status = COALESCE(?, status),
          is_featured = COALESCE(?, is_featured),
          is_preorder_active = COALESCE(?, is_preorder_active),
          primary_image = COALESCE(?, primary_image),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        name ?? null,
        tagline ?? null,
        description ?? null,
        grade ?? null,
        harvestSeason ?? null,
        status ?? null,
        isFeatured !== undefined ? (isFeatured ? 1 : 0) : null,
        isPreorderActive !== undefined ? (isPreorderActive ? 1 : 0) : null,
        primaryImage ?? null,
        id
      );

      if (body.payment_method_overrides && typeof body.payment_method_overrides === 'object') {
        for (const [code, st] of Object.entries(body.payment_method_overrides)) {
          await setProductPaymentOverride(id, code, st as any);
        }
      }

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'PRODUCT_UPDATED',
        resourceType: 'PRODUCT',
        resourceId: id,
        previousState: existing,
        newState: body
      });

      return NextResponse.json({ success: true });
    }

    // 1c. UPDATE PAYMENT METHOD OVERRIDES FOR PRODUCT
    if (action === 'UPDATE_PAYMENT_OVERRIDES') {
      const { productId, overrides } = body;
      if (!productId || !overrides || typeof overrides !== 'object') {
        return NextResponse.json({ error: 'productId and overrides map are required' }, { status: 400 });
      }

      for (const [code, st] of Object.entries(overrides)) {
        await setProductPaymentOverride(productId, code, st as any);
      }

      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'PRODUCT_PAYMENT_OVERRIDES_UPDATED',
        resourceType: 'PRODUCT',
        resourceId: productId,
        newState: overrides
      });

      return NextResponse.json({ success: true, message: 'Payment overrides updated successfully' });
    }

    // 2. UPDATE PACKAGE SIZE
    const { packageId, basePrice, salePrice, preorderPrice, isActive } = body;
    if (!packageId) {
      return NextResponse.json({ error: 'Package ID required' }, { status: 400 });
    }

    const existingPkg = (await db.prepare('SELECT * FROM package_sizes WHERE id = ?').get(packageId)) as any;
    if (!existingPkg) {
      return NextResponse.json({ error: 'Package size not found' }, { status: 404 });
    }

    await db.prepare(`
      UPDATE package_sizes
      SET 
        base_price = COALESCE(?, base_price),
        sale_price = COALESCE(?, sale_price),
        preorder_price = COALESCE(?, preorder_price),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      basePrice !== undefined ? Number(basePrice) : null,
      salePrice !== undefined ? Number(salePrice) : null,
      preorderPrice !== undefined ? Number(preorderPrice) : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      packageId
    );

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'PACKAGE_SIZE_UPDATED',
      resourceType: 'PACKAGE_SIZE',
      resourceId: packageId,
      previousState: existingPkg,
      newState: { basePrice, salePrice, preorderPrice, isActive }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin products PUT error:', err);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'products:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const packageId = searchParams.get('packageId');
    const db = getDatabase();

    if (productId) {
      // Soft-archive product
      await db.prepare("UPDATE products SET status = 'INACTIVE' WHERE id = ?").run(productId);
      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'PRODUCT_ARCHIVED',
        resourceType: 'PRODUCT',
        resourceId: productId
      });
      return NextResponse.json({ success: true, message: 'Product marked INACTIVE' });
    }

    if (packageId) {
      await db.prepare('UPDATE package_sizes SET is_active = 0 WHERE id = ?').run(packageId);
      await recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'PACKAGE_SIZE_DEACTIVATED',
        resourceType: 'PACKAGE_SIZE',
        resourceId: packageId
      });
      return NextResponse.json({ success: true, message: 'Package size deactivated' });
    }

    return NextResponse.json({ error: 'Specify productId or packageId' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin products DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
