import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';

export async function GET() {
  try {
    ensureDatabaseReady();
    const db = getDatabase();

    const varieties = db.prepare(`
      SELECT * FROM mango_varieties
      WHERE is_active = 1
      ORDER BY sort_order ASC, sweetness_brix DESC
    `).all();

    return NextResponse.json({ success: true, varieties });
  } catch (err: any) {
    console.error('Fetch varieties error:', err);
    return NextResponse.json({ error: 'Failed to fetch varieties' }, { status: 500 });
  }
}
