import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getLocationsList,
  createLocation,
  updateLocation,
  softDeactivateLocation,
  getProvinces,
  getDistricts
} from '@/lib/services/locations.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const province = searchParams.get('province') || undefined;
    const district = searchParams.get('district') || undefined;
    const serviceableOnly = searchParams.get('serviceableOnly') === 'true';
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const codOnly = searchParams.get('codOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = getLocationsList({
      search,
      province,
      district,
      serviceableOnly,
      activeOnly,
      codOnly,
      page,
      limit
    });

    const provinces = getProvinces();
    const districts = province ? getDistricts(province) : [];

    return NextResponse.json({
      success: true,
      ...result,
      provinces,
      districts
    });
  } catch (err: any) {
    console.error('Admin locations GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve location inventory.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 403 });
    }

    const body = await req.json();
    const { province, district, city } = body;

    if (!province || !district || !city) {
      return NextResponse.json({ error: 'Province, District, and City are required.' }, { status: 400 });
    }

    const newLoc = createLocation(body);
    return NextResponse.json({
      success: true,
      message: `Location ${newLoc.city}, ${newLoc.district} added successfully.`,
      location: newLoc
    });
  } catch (err: any) {
    console.error('Admin locations POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create location.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required.' }, { status: 400 });
    }

    const ok = updateLocation(id, data);
    if (!ok) {
      return NextResponse.json({ error: 'Location not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully.'
    });
  } catch (err: any) {
    console.error('Admin locations PUT error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update location.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized administrative access.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required.' }, { status: 400 });
    }

    const ok = softDeactivateLocation(id);
    if (!ok) {
      return NextResponse.json({ error: 'Location not found or already inactive.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Location deactivated successfully (archived to protect historical orders).'
    });
  } catch (err: any) {
    console.error('Admin locations DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to deactivate location.' }, { status: 500 });
  }
}
