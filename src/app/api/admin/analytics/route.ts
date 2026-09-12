import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { getAnalyticsDashboard, DateRangePreset } from '@/lib/services/analytics.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!hasPermission(user.role, 'analytics:read') && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: insufficient administrative permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const preset = (searchParams.get('range') || '30d') as DateRangePreset;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const scopeParam = searchParams.get('scope');
    const scope = (scopeParam === 'DEMO' || scopeParam === 'ALL' || scopeParam === 'PRODUCTION')
      ? scopeParam
      : undefined;
    const includeDemo = searchParams.get('includeDemo') === 'true';
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const data = getAnalyticsDashboard({
      preset,
      startDate,
      endDate,
      scope,
      includeDemo,
      includeArchived
    });

    return NextResponse.json({
      success: true,
      data
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/analytics:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
