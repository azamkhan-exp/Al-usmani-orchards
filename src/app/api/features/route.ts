import { NextResponse } from 'next/server';
import { getPublicFeatureFlags } from '@/lib/services/features.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const flags = getPublicFeatureFlags();
    return NextResponse.json({
      success: true,
      features: flags
    });
  } catch (err: any) {
    console.error('Error fetching public feature flags:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve feature flags' },
      { status: 500 }
    );
  }
}
