import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { getCurrentUser } from '@/lib/auth/session';

interface NotificationPreferences {
  orderUpdates: boolean;
  deliveryUpdates: boolean;
  promotionalOffers: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  deliveryUpdates: true,
  promotionalOffers: false
};

export async function GET() {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const customer = db.prepare('SELECT notes FROM customers WHERE user_id = ? OR email = ?').get(user.id, user.email) as any;

    let preferences = DEFAULT_PREFERENCES;
    if (customer?.notes) {
      try {
        const parsed = JSON.parse(customer.notes);
        if (parsed.notifications) {
          preferences = { ...DEFAULT_PREFERENCES, ...parsed.notifications };
        }
      } catch {
        // use defaults if unparseable
      }
    }

    return NextResponse.json({ success: true, preferences });
  } catch (err: any) {
    console.error('Customer notifications fetch error:', err);
    return NextResponse.json({ error: 'Failed to retrieve notification settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderUpdates, deliveryUpdates, promotionalOffers } = body;

    const db = getDatabase();
    const customer = db.prepare('SELECT id, notes FROM customers WHERE user_id = ? OR email = ?').get(user.id, user.email) as any;

    let currentNotesObj: Record<string, any> = {};
    if (customer?.notes) {
      try {
        currentNotesObj = JSON.parse(customer.notes);
      } catch {
        currentNotesObj = {};
      }
    }

    currentNotesObj.notifications = {
      orderUpdates: Boolean(orderUpdates),
      deliveryUpdates: Boolean(deliveryUpdates),
      promotionalOffers: Boolean(promotionalOffers)
    };

    const newNotes = JSON.stringify(currentNotesObj);

    if (customer?.id) {
      db.prepare('UPDATE customers SET notes = ? WHERE id = ?').run(newNotes, customer.id);
    }

    return NextResponse.json({
      success: true,
      preferences: currentNotesObj.notifications,
      message: 'Notification preferences updated.'
    });
  } catch (err: any) {
    console.error('Customer notifications update error:', err);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
