import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { serializePreorderCampaigns } from '@/lib/serializers';

export async function GET() {
  try {
    ensureDatabaseReady();
    const db = getDatabase();

    const rawCampaigns = db.prepare(`
      SELECT 
        c.*,
        p.name as product_name,
        p.slug as product_slug,
        p.grade as product_grade,
        v.name as variety_name,
        v.sweetness_brix,
        ps.name as package_name,
        ps.weight_kg
      FROM preorder_campaigns c
      JOIN products p ON p.id = c.product_id
      JOIN mango_varieties v ON v.id = p.variety_id
      JOIN package_sizes ps ON ps.id = c.package_size_id
      WHERE c.status IN ('ACTIVE', 'HARVEST_READY')
      ORDER BY c.expected_dispatch_date ASC
    `).all();

    const campaigns = serializePreorderCampaigns(rawCampaigns);

    return NextResponse.json({ success: true, campaigns });
  } catch (err: any) {
    console.error('Fetch preorders error:', err);
    return NextResponse.json({ error: 'Failed to fetch preorder campaigns' }, { status: 500 });
  }
}
