import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, runTransaction } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { recordAuditLog } from '@/lib/services/audit.service';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validateMagicBytes(buffer: Buffer): { valid: boolean; ext: string } {
  if (buffer.length < 12) return { valid: false, ext: '' };

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, ext: 'png' };
  }

  // WebP: RIFF ... WEBP
  const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
  const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
  if (isRiff && isWebp) {
    return { valid: true, ext: 'webp' };
  }

  return { valid: false, ext: '' };
}

function syncProductGalleryJson(productId: string) {
  const db = getDatabase();
  const images = db
    .prepare(`SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC`)
    .all(productId) as Array<{ image_url: string }>;

  const galleryUrls = images.map((i) => i.image_url);
  db.prepare(`UPDATE products SET gallery_json = ?, updated_at = datetime('now') WHERE id = ?`).run(
    JSON.stringify(galleryUrls),
    productId
  );
}

// 1. GET /api/admin/products/images?productId=...
export async function GET(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'products:read')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId parameter is required' }, { status: 400 });
    }

    const db = getDatabase();
    const images = db
      .prepare(
        `SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC, created_at ASC`
      )
      .all(productId);

    return NextResponse.json({ success: true, images });
  } catch (err: any) {
    console.error('Error fetching product images:', err);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}

// 2. POST /api/admin/products/images (Multipart file upload)
export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'products:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await req.formData();
    const productId = formData.get('productId') as string;
    const file = formData.get('file') as File | null;
    const altText = (formData.get('altText') as string) || '';
    const setAsPrimaryParam = formData.get('setAsPrimary') === 'true';

    if (!productId || !file) {
      return NextResponse.json({ error: 'productId and file are required' }, { status: 400 });
    }

    const db = getDatabase();
    const product = db.prepare('SELECT id, name FROM products WHERE id = ?').get(productId) as any;
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum allowed limit of 5MB.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only JPEG, PNG, and WebP images are permitted.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { valid, ext } = validateMagicBytes(buffer);
    if (!valid) {
      return NextResponse.json(
        { error: 'File signature verification failed. The uploaded file is not a genuine image.' },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeFileName = `product-${crypto.randomUUID()}.${ext}`;
    const physicalPath = path.join(uploadsDir, safeFileName);
    const publicUrl = `/uploads/products/${safeFileName}`;

    await fs.writeFile(physicalPath, buffer);

    const existingImages = db
      .prepare('SELECT count(*) as count FROM product_images WHERE product_id = ?')
      .get(productId) as { count: number };

    const shouldBePrimary = setAsPrimaryParam || existingImages.count === 0;
    const imageId = `pimg_${crypto.randomUUID()}`;

    runTransaction(() => {
      if (shouldBePrimary) {
        db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').run(productId);
      }

      const nextSortOrder = existingImages.count;

      db.prepare(`
        INSERT INTO product_images (id, product_id, image_url, storage_path, alt_text, sort_order, is_primary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        imageId,
        productId,
        publicUrl,
        physicalPath,
        altText || `${product.name} - Luxury Harvest Presentation`,
        nextSortOrder,
        shouldBePrimary ? 1 : 0
      );

      if (shouldBePrimary) {
        db.prepare(`UPDATE products SET primary_image = ?, updated_at = datetime('now') WHERE id = ?`).run(
          publicUrl,
          productId
        );
      }

      syncProductGalleryJson(productId);
    });

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'UPLOAD_PRODUCT_IMAGE',
      resourceType: 'PRODUCT_IMAGE',
      resourceId: imageId,
      newState: { productId, publicUrl, isPrimary: shouldBePrimary }
    });

    const createdImage = db.prepare('SELECT * FROM product_images WHERE id = ?').get(imageId);
    return NextResponse.json({ success: true, image: createdImage });
  } catch (err: any) {
    console.error('Error uploading product image:', err);
    return NextResponse.json({ error: err.message || 'Failed to process image upload' }, { status: 500 });
  }
}

// 3. PUT /api/admin/products/images (Set primary, update alt-text, reorder)
export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'products:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { action, imageId, productId, altText, sortOrder, items } = body;
    const db = getDatabase();

    if (action === 'SET_PRIMARY') {
      if (!imageId || !productId) {
        return NextResponse.json({ error: 'imageId and productId are required' }, { status: 400 });
      }

      const img = db
        .prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?')
        .get(imageId, productId) as any;
      if (!img) {
        return NextResponse.json({ error: 'Image not found for this product' }, { status: 404 });
      }

      runTransaction(() => {
        db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').run(productId);
        db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').run(imageId);
        db.prepare(`UPDATE products SET primary_image = ?, updated_at = datetime('now') WHERE id = ?`).run(
          img.image_url,
          productId
        );
        syncProductGalleryJson(productId);
      });

      return NextResponse.json({ success: true, primaryImage: img.image_url });
    }

    if (action === 'UPDATE_METADATA') {
      if (!imageId) {
        return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
      }

      db.prepare(`
        UPDATE product_images 
        SET alt_text = COALESCE(?, alt_text),
            sort_order = COALESCE(?, sort_order)
        WHERE id = ?
      `).run(altText !== undefined ? altText : null, sortOrder !== undefined ? Number(sortOrder) : null, imageId);

      const updated = db.prepare('SELECT * FROM product_images WHERE id = ?').get(imageId) as any;
      if (updated) {
        syncProductGalleryJson(updated.product_id);
      }

      return NextResponse.json({ success: true, image: updated });
    }

    if (action === 'REORDER') {
      if (!Array.isArray(items) || !productId) {
        return NextResponse.json({ error: 'items array and productId are required' }, { status: 400 });
      }

      runTransaction(() => {
        const updateStmt = db.prepare('UPDATE product_images SET sort_order = ? WHERE id = ? AND product_id = ?');
        for (const item of items) {
          updateStmt.run(item.sort_order, item.id, productId);
        }
        syncProductGalleryJson(productId);
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('Error updating product image metadata:', err);
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}

// 4. DELETE /api/admin/products/images?imageId=...
export async function DELETE(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'products:write')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'imageId parameter is required' }, { status: 400 });
    }

    const db = getDatabase();
    const image = db.prepare('SELECT * FROM product_images WHERE id = ?').get(imageId) as any;
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const productId = image.product_id;
    const wasPrimary = Boolean(image.is_primary);

    // Physically unlink uploaded file if inside /uploads/products/
    if (image.storage_path) {
      try {
        await fs.unlink(image.storage_path);
      } catch (unlinkErr) {
        console.warn('Could not delete physical file from disk:', unlinkErr);
      }
    } else if (image.image_url?.startsWith('/uploads/products/')) {
      try {
        const filePath = path.join(process.cwd(), 'public', image.image_url);
        await fs.unlink(filePath);
      } catch (unlinkErr) {
        console.warn('Could not delete physical file from disk:', unlinkErr);
      }
    }

    runTransaction(() => {
      db.prepare('DELETE FROM product_images WHERE id = ?').run(imageId);

      if (wasPrimary) {
        const nextPrimary = db
          .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1')
          .get(productId) as any;

        if (nextPrimary) {
          db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').run(nextPrimary.id);
          db.prepare(`UPDATE products SET primary_image = ?, updated_at = datetime('now') WHERE id = ?`).run(
            nextPrimary.image_url,
            productId
          );
        } else {
          db.prepare(
            `UPDATE products SET primary_image = '/images/placeholder-mango.svg', updated_at = datetime('now') WHERE id = ?`
          ).run(productId);
        }
      }

      syncProductGalleryJson(productId);
    });

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'DELETE_PRODUCT_IMAGE',
      resourceType: 'PRODUCT_IMAGE',
      resourceId: imageId,
      previousState: image
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting product image:', err);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
