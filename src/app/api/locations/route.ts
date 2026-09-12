import { NextRequest, NextResponse } from 'next/server';
import {
  getProvinces,
  getDistricts,
  getCities,
  getLocationsList
} from '@/lib/services/locations.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'tree';
    const province = searchParams.get('province') || undefined;
    const district = searchParams.get('district') || undefined;
    const search = searchParams.get('search') || undefined;

    if (action === 'provinces') {
      const provinces = getProvinces();
      return NextResponse.json({ success: true, provinces });
    }

    if (action === 'districts') {
      const districts = getDistricts(province);
      return NextResponse.json({ success: true, province, districts });
    }

    if (action === 'cities') {
      const cities = getCities(province, district);
      return NextResponse.json({ success: true, province, district, cities });
    }

    if (search) {
      const result = getLocationsList({ search, limit: 20 });
      return NextResponse.json({ success: true, locations: result.locations });
    }

    // Default: return complete structured hierarchy
    const provinces = getProvinces();
    const firstProv = province || provinces[0] || 'Punjab';
    const districts = getDistricts(firstProv);
    const firstDist = district || districts[0] || 'Multan';
    const cities = getCities(firstProv, firstDist);

    return NextResponse.json({
      success: true,
      provinces,
      currentProvince: firstProv,
      districts,
      currentDistrict: firstDist,
      cities
    });
  } catch (err: any) {
    console.error('Locations API error:', err);
    return NextResponse.json({ error: 'Failed to retrieve location data.' }, { status: 500 });
  }
}
