import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getAllFeatureFlags, updateFeatureFlag } from '@/lib/services/features.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const flags = getAllFeatureFlags(true);
    return NextResponse.json({
      success: true,
      features: Object.values(flags)
    });
  } catch (err: any) {
    console.error('Error loading admin feature flags:', err);
    return NextResponse.json({ error: 'Failed to load feature flags' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to modify feature flags.' }, { status: 403 });
    }

    const body = await req.json();
    const { key, enabled, configuration } = body;

    if (!key || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Key and enabled boolean are required.' }, { status: 400 });
    }

    const updated = updateFeatureFlag(key, enabled, configuration, user.email);

    return NextResponse.json({
      success: true,
      feature: updated,
      message: `Feature '${updated.name}' is now ${updated.enabled ? 'ENABLED' : 'DISABLED'}.`
    });
  } catch (err: any) {
    console.error('Error updating feature flag:', err);
    return NextResponse.json({ error: err.message || 'Failed to update feature flag' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
