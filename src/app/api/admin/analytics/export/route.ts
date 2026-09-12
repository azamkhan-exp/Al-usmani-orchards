import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { generateReportData, DateRangePreset } from '@/lib/services/analytics.service';

export const dynamic = 'force-dynamic';

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

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
    const reportType = (searchParams.get('type') || 'sales') as any;
    const preset = (searchParams.get('range') || '30d') as DateRangePreset;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const validTypes = ['sales', 'orders', 'products', 'customers', 'inventory', 'payments', 'discounts'];
    if (!validTypes.includes(reportType)) {
      return NextResponse.json(
        { success: false, error: `Invalid report type. Allowed: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const report = await generateReportData(reportType, {
      preset,
      startDate,
      endDate
    });

    // Build CSV Content
    const headerRow = report.headers.map(escapeCsvCell).join(',');
    const bodyRows = report.rows.map((row: any[]) => row.map(escapeCsvCell).join(','));
    const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\r\n'); // Include UTF-8 BOM for Excel compatibility

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${report.filename}"`,
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (err: any) {
    console.error('Error exporting analytics report:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to export report' },
      { status: 500 }
    );
  }
}
