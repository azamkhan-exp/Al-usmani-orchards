import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureDatabaseReady();
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const db = getDatabase();
    const asset = (await db.prepare('SELECT mime_type, file_size, data FROM media_assets WHERE id = ?').get(id)) as any;

    if (!asset || !asset.data) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const buffer = Buffer.isBuffer(asset.data) ? asset.data : Buffer.from(asset.data);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': asset.mime_type || 'image/jpeg',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (err: any) {
    console.error('Error serving media asset:', err);
    return NextResponse.json({ error: 'Failed to retrieve media asset' }, { status: 500 });
  }
}
