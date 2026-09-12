import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getDatabase } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { assertFeatureEnabled } from '@/lib/services/features.service';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = assertFeatureEnabled('loyalty_rewards');
  if (!guard.enabled) {
    return NextResponse.json({ error: guard.error, code: 'FEATURE_DISABLED' }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    ensureDatabaseReady();
    const db = getDatabase();

    let customer = db.prepare('SELECT id, total_spent FROM customers WHERE user_id = ?').get(user.id) as any;
    if (!customer) {
      const customerId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO customers (id, user_id, full_name, email, phone, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(customerId, user.id, user.name || 'Valued Patron', user.email, (user as any).phone || null);
      customer = { id: customerId, total_spent: 0 };
    }

    // Fetch or provision loyalty account
    let account = db.prepare(`
      SELECT id, points_balance, lifetime_points, tier, updated_at
      FROM loyalty_accounts
      WHERE customer_id = ?
    `).get(customer.id) as any;

    if (!account) {
      const accountId = `loy_${crypto.randomUUID()}`;
      // Calculate initial earned points based on existing total_spent (1 point per 100 PKR)
      const initialPoints = Math.floor((customer.total_spent || 0) * 0.01);
      let tier = 'BRONZE';
      if (initialPoints >= 10000) tier = 'VIP';
      else if (initialPoints >= 5000) tier = 'GOLD';
      else if (initialPoints >= 1000) tier = 'SILVER';

      db.prepare(`
        INSERT INTO loyalty_accounts (id, customer_id, points_balance, lifetime_points, tier, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(accountId, customer.id, initialPoints, initialPoints, tier);

      if (initialPoints > 0) {
        db.prepare(`
          INSERT INTO loyalty_ledger (id, customer_id, order_id, points, type, description, created_at)
          VALUES (?, ?, NULL, ?, 'EARNED', 'Historic harvest purchases loyalty allocation', datetime('now'))
        `).run(`led_${crypto.randomUUID()}`, customer.id, initialPoints);
      }

      account = {
        id: accountId,
        points_balance: initialPoints,
        lifetime_points: initialPoints,
        tier
      };
    }

    // Ledger transactions
    const ledger = db.prepare(`
      SELECT id, points, type, description, order_id, created_at
      FROM loyalty_ledger
      WHERE customer_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(customer.id);

    // Tier thresholds & perks
    const tierPerks = {
      BRONZE: { name: 'Bronze Patron', threshold: 0, multiplier: '1x Points', perk: 'Standard cold-chain dispatch' },
      SILVER: { name: 'Silver Connoisseur', threshold: 1000, multiplier: '1.25x Points', perk: 'Free foam sleeve packaging' },
      GOLD: { name: 'Gold Ambassador', threshold: 5000, multiplier: '1.5x Points', perk: 'Early harvest access & priority dispatch' },
      VIP: { name: 'Royal Estate VIP', threshold: 10000, multiplier: '2x Points', perk: 'Dedicated orchard concierge & complimentary tasting crate' }
    };

    return NextResponse.json({
      success: true,
      account: {
        pointsBalance: account.points_balance,
        lifetimePoints: account.lifetime_points,
        tier: account.tier,
        rupeesValue: account.points_balance, // 1 point = 1 PKR
        tierDetails: tierPerks[account.tier as keyof typeof tierPerks] || tierPerks.BRONZE
      },
      ledger,
      tierPerks
    });
  } catch (err: any) {
    console.error('Error fetching loyalty rewards:', err);
    return NextResponse.json({ error: 'Failed to retrieve loyalty points' }, { status: 500 });
  }
}
