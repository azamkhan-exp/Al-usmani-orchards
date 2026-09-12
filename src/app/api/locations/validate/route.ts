import { NextRequest, NextResponse } from 'next/server';
import { validateCheckoutLocation } from '@/lib/services/locations.service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { province, district, city } = body;

    if (!city) {
      return NextResponse.json({ error: 'City is required for delivery validation.' }, { status: 400 });
    }

    const validation = await validateCheckoutLocation(province || '', district || '', city);
    return NextResponse.json({
      success: true,
      validation
    });
  } catch (err: any) {
    console.error('Location validation error:', err);
    return NextResponse.json({ error: 'Failed to validate delivery location.' }, { status: 500 });
  }
}
