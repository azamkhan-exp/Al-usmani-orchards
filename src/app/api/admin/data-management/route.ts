import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import {
  getDatabaseOverview,
  previewDemoDataCleanup,
  executeDemoDataCleanup,
  setProductionProtectionSettings,
  executeDataRetentionCleanup
} from '@/lib/services/data-management.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'overview';

    if (action === 'preview_cleanup') {
      const preview = await previewDemoDataCleanup();
      return NextResponse.json({ success: true, preview });
    }

    if (action === 'archived_orders') {
      const { getDatabase } = await import('@/lib/db');
      const { ensureDatabaseReady } = await import('@/lib/db/init');
      ensureDatabaseReady();
      const db = getDatabase();
      const rows = await db.prepare(`
        SELECT 
          o.id, 
          o.order_number, 
          COALESCE(c.full_name, o.guest_name, 'Guest') as customer_name, 
          o.total_amount, 
          o.created_at, 
          o.status, 
          o.archived_at
        FROM orders o
        LEFT JOIN customers c ON c.id = o.customer_id
        WHERE o.is_archived = 1 
        ORDER BY o.archived_at DESC 
        LIMIT 50
      `).all();
      return NextResponse.json({ success: true, orders: rows });
    }

    const overview = await getDatabaseOverview();
    return NextResponse.json({ success: true, overview });
  } catch (err: any) {
    console.error('Data management GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve data management metrics.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. Cleanup Demo Data
    if (action === 'CLEANUP') {
      const { password, otpCode, confirmationPhrase, categories } = body;

      const cleanupResult = await executeDemoDataCleanup({
        userId: user.id,
        userEmail: user.email,
        password,
        otpCode,
        confirmationPhrase,
        categories
      });

      if (!cleanupResult.success) {
        return NextResponse.json({ error: cleanupResult.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Demo data cleanup completed successfully.',
        deleted_counts: cleanupResult.deleted_counts
      });
    }

    // 2. Production Launch Reset
    if (action === 'PRODUCTION_LAUNCH_RESET') {
      const { password, otpCode, confirmationPhrase } = body;
      const { executeProductionLaunchReset } = await import('@/lib/services/data-management.service');

      const resetResult = await executeProductionLaunchReset({
        userId: user.id,
        userEmail: user.email,
        password,
        otpCode,
        confirmationPhrase
      });

      if (!resetResult.success) {
        return NextResponse.json({ error: resetResult.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Production Launch Reset completed successfully. Store is now ready for public launch.',
        deleted_counts: resetResult.deleted_counts
      });
    }

    // 3. Archive Order
    if (action === 'ARCHIVE_ORDER') {
      const { orderId } = body;
      if (!orderId) {
        return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });
      }
      const { archiveOrder } = await import('@/lib/services/data-management.service');
      const success = await archiveOrder(orderId, user.id, user.email);
      if (!success) {
        return NextResponse.json({ error: 'Failed to archive order or order not found.' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: `Order ${orderId} archived successfully.` });
    }

    // 4. Restore Order
    if (action === 'RESTORE_ORDER') {
      const { orderId } = body;
      if (!orderId) {
        return NextResponse.json({ error: 'orderId is required.' }, { status: 400 });
      }
      const { restoreOrder } = await import('@/lib/services/data-management.service');
      const success = await restoreOrder(orderId, user.id, user.email);
      if (!success) {
        return NextResponse.json({ error: 'Failed to restore order or order not found.' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: `Order ${orderId} restored to active status.` });
    }

    // 5. Toggle Production Protection Lock
    if (action === 'TOGGLE_PROTECTION') {
      const { enabled, maintenance_mode } = body;
      const updated = await setProductionProtectionSettings(
        {
          ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}),
          ...(maintenance_mode !== undefined ? { maintenance_mode: Boolean(maintenance_mode) } : {})
        },
        user.id,
        user.email
      );

      return NextResponse.json({
        success: true,
        message: `Production protection ${updated.enabled ? 'ENABLED' : 'DISABLED'}.`,
        protection: updated
      });
    }

    // 6. Retention Cleanup
    if (action === 'RETENTION_CLEANUP') {
      const retentionResult = await executeDataRetentionCleanup();
      return NextResponse.json({
        success: true,
        message: 'Data retention cleanup completed.',
        result: retentionResult
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('Data management POST error:', err);
    return NextResponse.json({ error: err.message || 'Operation failed.' }, { status: 500 });
  }
}
