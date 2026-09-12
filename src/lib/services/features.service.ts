import { getDatabase } from '../db';
import { ensureDatabaseReady } from '../db/init';

export type FeatureCategory =
  | 'CUSTOMER_EXPERIENCE'
  | 'MARKETING'
  | 'SALES_DELIVERY'
  | 'COMMUNICATION'
  | 'ORCHARD_CATALOG';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: FeatureCategory;
  enabled: boolean;
  customer_visible: boolean;
  admin_visible: boolean;
  configuration: Record<string, any>;
  updated_at?: string;
  updated_by?: string;
}

export const MASTER_FEATURE_CATALOG: FeatureFlag[] = [
  // 1. Customer Experience
  {
    key: 'customer_profile',
    name: 'Customer Profile & Dashboard',
    description: 'Personalized patron dashboard with orders, stats, address book, and profile completion tracking.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'wishlist',
    name: 'Wishlist',
    description: 'Enables patrons to save favorite mango harvest crates and add them directly to their cart.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'back_in_stock',
    name: 'Back-in-Stock Alerts',
    description: 'Subscribes patrons to automated email & WhatsApp alerts when sold-out harvest varieties return to stock.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'gift_ordering',
    name: 'Gift Orders',
    description: 'Allows senders to specify recipient details, handwritten parchment messages, and royal presentation.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'order_tracking',
    name: 'Advanced Order Tracking',
    description: 'Live 5-stage consignment pipeline with courier tracking numbers and carrier status.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'buy_again',
    name: 'Buy Again / Reorder',
    description: 'Allows one-click reordering of previously delivered crates with real-time price & stock validation.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'address_management',
    name: 'Address Book Management',
    description: 'Allows patrons to save and manage multiple shipping destinations with default designation.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'product_reviews',
    name: 'Product Reviews & Ratings',
    description: 'Allows verified buyers to rate varieties (1-5 stars) with admin moderation queues.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: { require_verified_purchase: true, auto_approve: false }
  },
  {
    key: 'photo_reviews',
    name: 'Customer Photo Reviews',
    description: 'Enables unboxing and fruit photo attachments on verified customer reviews.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: false,
    customer_visible: true,
    admin_visible: true,
    configuration: { max_photos: 3, max_size_mb: 5 }
  },
  {
    key: 'mango_comparison',
    name: 'Mango Variety Comparison Matrix',
    description: 'Interactive side-by-side comparison modal highlighting Brix sweetness, aroma, season, and tasting notes.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'advanced_search',
    name: 'Advanced Product Search & Filters',
    description: 'Multi-criteria storefront search by variety, sweetness Brix, harvest season, and price range.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'personalized_home',
    name: 'Personalized Homepage',
    description: 'Adapts storefront sections to display recently viewed varieties, popular cultivars, and recommendations.',
    category: 'CUSTOMER_EXPERIENCE',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },

  // 2. Marketing & Sales
  {
    key: 'loyalty_rewards',
    name: 'Loyalty & Rewards Program',
    description: 'Earn points per PKR spent, unlock Bronze/Silver/Gold/VIP tiers, and redeem points for order discounts.',
    category: 'MARKETING',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: { points_per_pkr: 0.01, redemption_rate_pkr: 1, min_redemption_points: 100 }
  },
  {
    key: 'coupons',
    name: 'Coupons & Promotions Engine',
    description: 'Server-side validated promotional coupon codes with percentage, fixed, and volume thresholds.',
    category: 'MARKETING',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'flash_offers',
    name: 'Flash Offers & Seasonal Countdowns',
    description: 'Time-limited promotional banners with countdown timers and automated expiry.',
    category: 'MARKETING',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'abandoned_cart_recovery',
    name: 'Abandoned Cart Recovery',
    description: 'Tracks unfinalized crates and sends automated reminder alerts via email and WhatsApp.',
    category: 'MARKETING',
    enabled: true,
    customer_visible: false,
    admin_visible: true,
    configuration: { delay_hours: 2, max_reminders: 2 }
  },
  {
    key: 'customer_analytics',
    name: 'Customer Lifetime Value (CLV) Analytics',
    description: 'Admin dashboard analytics for Repeat Purchase Rate, AOV, Top Cities, and Patron retention.',
    category: 'MARKETING',
    enabled: true,
    customer_visible: false,
    admin_visible: true,
    configuration: {}
  },

  // 3. Sales & Delivery
  {
    key: 'smart_delivery',
    name: 'Smart Delivery System',
    description: 'City-specific cold-chain shipping rules, transit timelines, and free shipping progress meter.',
    category: 'SALES_DELIVERY',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: { free_shipping_threshold: 10000, standard_shipping_fee: 350 }
  },
  {
    key: 'smart_cart',
    name: 'Smart Cart with Free Shipping Meter',
    description: 'Visual progress bar towards free delivery, volume tier savings, and stock warnings.',
    category: 'SALES_DELIVERY',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'international_ordering',
    name: 'International Ordering (UAE / UK Foundation)',
    description: 'Enables overseas patron checkout with country-specific freight rules and currency indicators.',
    category: 'SALES_DELIVERY',
    enabled: false,
    customer_visible: true,
    admin_visible: true,
    configuration: { countries: ['AE', 'GB'] }
  },

  // 4. Communication & WhatsApp
  {
    key: 'whatsapp_support',
    name: 'WhatsApp Customer Support Concierge',
    description: 'Direct floating and header link connecting patrons directly with our Multan harvest desk.',
    category: 'COMMUNICATION',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: { phone: '+92 300 8472910' }
  },
  {
    key: 'customer_notifications',
    name: 'Automated Customer Email Notifications',
    description: 'Sends real-time branded HTML receipts, order confirmation, and cold-chain dispatch notices.',
    category: 'COMMUNICATION',
    enabled: true,
    customer_visible: false,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'whatsapp_notifications',
    name: 'WhatsApp Business Cloud API Order Alerts',
    description: 'Official Meta Cloud API dispatch of automated order confirmations and shipping tracking alerts.',
    category: 'COMMUNICATION',
    enabled: true,
    customer_visible: false,
    admin_visible: true,
    configuration: { api_version: 'v21.0' }
  },

  // 5. Orchard Catalog & AI
  {
    key: 'farm_traceability',
    name: 'Farm Story & Terroir Traceability',
    description: 'Displays orchard block origin, soil classification, and dawn plucking batch records.',
    category: 'ORCHARD_CATALOG',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'seasonal_availability',
    name: 'Seasonal Mango Availability Badges',
    description: 'Displays live status badges on varieties: Available, Pre-Order, Coming Soon, or Season Ended.',
    category: 'ORCHARD_CATALOG',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  },
  {
    key: 'ai_recommendations',
    name: 'AI Personalized Mango Concierge',
    description: 'RAG-powered conversational recommendations grounded in live harvest stocks and Brix index.',
    category: 'ORCHARD_CATALOG',
    enabled: true,
    customer_visible: true,
    admin_visible: true,
    configuration: {}
  }
];

// In-memory cache with 30s TTL
let flagsCache: Record<string, FeatureFlag> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30_000;

/**
 * Seed master feature catalog into PostgreSQL if not already present.
 */
export async function seedFeatureFlags(): Promise<void> {
  ensureDatabaseReady();
  const db = getDatabase();

  const insertStmt = db.prepare(`
    INSERT INTO feature_flags (
      key, name, description, category, enabled, customer_visible, admin_visible, configuration_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO NOTHING
  `);

  for (const f of MASTER_FEATURE_CATALOG) {
    try {
      await insertStmt.run(
        f.key,
        f.name,
        f.description,
        f.category,
        f.enabled ? 1 : 0,
        f.customer_visible ? 1 : 0,
        f.admin_visible ? 1 : 0,
        JSON.stringify(f.configuration || {})
      );
    } catch (e) {
      // Ignore conflict
    }
  }
}

/**
 * Retrieve all feature flags from PostgreSQL (with in-memory cache).
 */
export async function getAllFeatureFlags(forceFresh = false): Promise<Record<string, FeatureFlag>> {
  const now = Date.now();
  if (!forceFresh && flagsCache && now - lastFetchTime < CACHE_TTL_MS) {
    return flagsCache;
  }

  ensureDatabaseReady();
  const db = getDatabase();

  try {
    const rows = await db.prepare(`
      SELECT key, name, description, category, enabled, customer_visible, admin_visible, configuration_json, updated_at, updated_by
      FROM feature_flags
    `).all() as any[];

    const result: Record<string, FeatureFlag> = {};
    for (const r of (rows || [])) {
      let config = {};
      try {
        config = JSON.parse(r.configuration_json || '{}');
      } catch {
        config = {};
      }

      result[r.key] = {
        key: r.key,
        name: r.name,
        description: r.description,
        category: r.category as FeatureCategory,
        enabled: Boolean(Number(r.enabled)),
        customer_visible: Boolean(Number(r.customer_visible)),
        admin_visible: Boolean(Number(r.admin_visible)),
        configuration: config,
        updated_at: r.updated_at,
        updated_by: r.updated_by
      };
    }

    // Merge any missing defaults
    for (const def of MASTER_FEATURE_CATALOG) {
      if (!result[def.key]) {
        result[def.key] = { ...def };
      }
    }

    flagsCache = result;
    lastFetchTime = now;
    return result;
  } catch (err) {
    console.error('[FEATURES:LoadError] Failed to read feature flags from database, using catalog fallback:', err);
    const fallback: Record<string, FeatureFlag> = {};
    for (const def of MASTER_FEATURE_CATALOG) {
      fallback[def.key] = { ...def };
    }
    return fallback;
  }
}

/**
 * Authoritative server-side feature check.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getAllFeatureFlags();
  return flags[key] ? flags[key].enabled : true;
}

/**
 * Throws or returns standard HTTP 403 response if feature is disabled.
 */
export async function assertFeatureEnabled(key: string): Promise<{ enabled: boolean; error?: string }> {
  const enabled = await isFeatureEnabled(key);
  if (!enabled) {
    return {
      enabled: false,
      error: `The requested feature '${key}' is currently disabled by store administration.`
    };
  }
  return { enabled: true };
}

/**
 * Update a feature flag state in PostgreSQL and log admin audit record.
 */
export async function updateFeatureFlag(
  key: string,
  enabled: boolean,
  configuration?: Record<string, any>,
  adminEmail?: string
): Promise<FeatureFlag> {
  ensureDatabaseReady();
  const db = getDatabase();

  const allFlags = await getAllFeatureFlags();
  const prev = allFlags[key];
  const configJson = configuration ? JSON.stringify(configuration) : (prev ? JSON.stringify(prev.configuration) : '{}');

  await db.prepare(`
    UPDATE feature_flags
    SET enabled = ?, configuration_json = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
    WHERE key = ?
  `).run(enabled ? 1 : 0, configJson, adminEmail || 'admin@alusmaniorchards.pk', key);

  // Log in admin_audit_logs
  try {
    const crypto = await import('node:crypto');
    await db.prepare(`
      INSERT INTO admin_audit_logs (id, user_id, user_email, action, resource_type, resource_id, previous_state, new_state, created_at)
      VALUES (?, NULL, ?, 'UPDATE_FEATURE_FLAG', 'FEATURE_FLAG', ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      crypto.randomUUID(),
      adminEmail || 'admin@alusmaniorchards.pk',
      key,
      JSON.stringify({ enabled: prev?.enabled }),
      JSON.stringify({ enabled, configuration })
    );
  } catch (e) {
    // Non-fatal
  }

  // Invalidate cache
  flagsCache = null;
  lastFetchTime = 0;

  const freshFlags = await getAllFeatureFlags(true);
  return freshFlags[key];
}

/**
 * Returns public-safe map of feature states for storefront hydration.
 */
export async function getPublicFeatureFlags(): Promise<Record<string, boolean>> {
  const flags = await getAllFeatureFlags();
  const publicMap: Record<string, boolean> = {};

  for (const [key, flag] of Object.entries(flags)) {
    if (flag.customer_visible) {
      publicMap[key] = flag.enabled;
    }
  }

  return publicMap;
}
