import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser, hasPermission } from '@/lib/auth/session';
import { getFinancialOverview, getCashFlowTrends } from '@/lib/services/finance.service';
import { recordAuditLog } from '@/lib/services/audit.service';
import crypto from 'node:crypto';

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'finance:read')) {
      return NextResponse.json({ error: 'Unauthorized: Finance privileges required.' }, { status: 403 });
    }

    const db = getDatabase();
    const overview = await getFinancialOverview();
    const cashFlow = await getCashFlowTrends();

    // Expenses list
    const expenses = await db.prepare(`
      SELECT e.*, c.name as category_name
      FROM expenses e
      JOIN expense_categories c ON c.id = e.category_id
      ORDER BY e.expense_date DESC
      LIMIT 100
    `).all();

    // Expense Categories
    const categories = await db.prepare('SELECT * FROM expense_categories ORDER BY name ASC').all();

    // Accounts Receivable
    const receivables = await db.prepare(`
      SELECT ar.*, o.order_number
      FROM accounts_receivable ar
      LEFT JOIN orders o ON o.id = ar.order_id
      ORDER BY ar.status ASC, ar.due_date ASC
    `).all();

    // Accounts Payable
    const payables = await db.prepare(`
      SELECT * FROM accounts_payable
      ORDER BY status ASC, due_date ASC
    `).all();

    return NextResponse.json({
      success: true,
      overview,
      cashFlow,
      expenses,
      categories,
      receivables,
      payables
    });
  } catch (err: any) {
    console.error('Admin finance GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user || !hasPermission(user.role, 'finance:write')) {
      return NextResponse.json({ error: 'Unauthorized: Finance management required.' }, { status: 403 });
    }

    const body = await req.json();
    const { categoryId, amount, expenseDate, description, vendorName, paymentMethod, referenceNo } = body;

    if (!categoryId || !amount || !description) {
      return NextResponse.json({ error: 'Category, amount, and description are required.' }, { status: 400 });
    }

    const db = getDatabase();
    const expenseId = crypto.randomUUID();

    await db.prepare(`
      INSERT INTO expenses (
        id, category_id, amount, expense_date, description, vendor_name,
        payment_method, reference_no, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      expenseId,
      categoryId,
      Number(amount),
      expenseDate || new Date().toISOString().split('T')[0],
      description.trim(),
      vendorName || null,
      paymentMethod || 'BANK_TRANSFER',
      referenceNo || `REF-${Math.floor(10000 + Math.random() * 90000)}`,
      user.name
    );

    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'EXPENSE_RECORDED',
      resourceType: 'EXPENSE',
      resourceId: expenseId,
      newState: { categoryId, amount, description, vendorName }
    });

    return NextResponse.json({ success: true, expenseId });
  } catch (err: any) {
    console.error('Admin finance POST error:', err);
    return NextResponse.json({ error: 'Failed to record expense' }, { status: 500 });
  }
}
