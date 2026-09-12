import { NextResponse } from 'next/server';
import { getPublicStoreSettings } from '@/lib/services/settings.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = getPublicStoreSettings();
    return NextResponse.json({
      success: true,
      settings
    });
  } catch (err: any) {
    console.error('Public settings GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve store settings' }, { status: 500 });
  }
}
