import { getDatabase } from '../db';
import { ensureDatabaseReady } from '../db/init';

export interface GeneralSettings {
  store_name: string;
  tagline: string;
  positioning: string;
  estd_year?: number;
  currency: string;
  currency_symbol?: string;
  announcement_enabled?: boolean;
  announcement_banner?: string;
  announcement_link?: string;
  announcement_animation?: boolean;
  timezone?: string;
}

export interface FarmLocation {
  name: string;
  address: string;
}

export interface ContactSettings {
  support_email: string;
  phone: string;
  whatsapp: string;
  farm_locations: FarmLocation[];
}

export interface ShippingSettings {
  standard_shipping_fee: number;
  free_shipping_threshold: number;
  express_shipping_fee: number;
  estimated_days: string;
}

export interface SeoSettings {
  meta_title: string;
  meta_description: string;
  keywords: string;
}

export interface NotificationSettings {
  admin_email: string;
  admin_whatsapp: string;
  enable_admin_email: boolean;
  enable_admin_whatsapp: boolean;
  enable_customer_email: boolean;
  enable_customer_whatsapp: boolean;
  whatsapp_provider: 'META_CLOUD' | 'SIMULATED';
  meta_phone_number_id: string;
  meta_access_token: string;
}

export interface PublicStoreSettings {
  general: GeneralSettings;
  contact: ContactSettings;
  shipping: ShippingSettings;
  seo: SeoSettings;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  store_name: 'Al Usmani Orchards',
  tagline: 'From Our Orchards to Your Door.',
  positioning: 'Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care',
  estd_year: 1934,
  currency: 'PKR',
  currency_symbol: 'Rs.',
  announcement_enabled: true,
  announcement_banner: '🥭 Premium Pakistani Mangoes • Farm Fresh • Delivered to Your Door • Seasonal Selection • Zero Calcium Carbide • Nationwide Express Cold-Chain',
  announcement_link: '/#harvest',
  announcement_animation: true
};

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  support_email: 'harvest@alusmaniorchards.pk',
  phone: '+92 300 8472910',
  whatsapp: '+92 300 8472910',
  farm_locations: [
    { name: 'Multan Royal Estate', address: 'Shujabad Road, Multan, Punjab, Pakistan' },
    { name: 'Mirpur Khas Heritage Grove', address: 'Mirwah Gorchani, Mirpur Khas, Sindh, Pakistan' }
  ]
};

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  standard_shipping_fee: 350,
  free_shipping_threshold: 10000,
  express_shipping_fee: 600,
  estimated_days: '1 - 2 business days'
};

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  meta_title: 'Al Usmani Orchards | Fresh from Our Orchards • Premium Pakistani Mangoes',
  meta_description: 'From Our Orchards to Your Door. Hand-picked Multani Chaunsa, Sindhri, Anwar Ratol, Dussehri. Tree-ripened, 100% calcium carbide-free, nationwide 24h cold-chain dispatch.',
  keywords: 'Buy Chaunsa Mango Online, Al Usmani Orchards, Premium Pakistani Mangoes, Fresh Mango Delivery, Multan Mangoes'
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  admin_email: 'orders@alusmaniorchards.pk',
  admin_whatsapp: '+92 300 8472910',
  enable_admin_email: true,
  enable_admin_whatsapp: true,
  enable_customer_email: true,
  enable_customer_whatsapp: true,
  whatsapp_provider: 'SIMULATED',
  meta_phone_number_id: '',
  meta_access_token: ''
};

/**
 * Retrieve all store settings from PostgreSQL.
 * Internal only — may contain sensitive operational fields (SMTP, security, etc.).
 */
export async function getAllStoreSettings(): Promise<Record<string, any>> {
  ensureDatabaseReady();
  const db = getDatabase();

  try {
    const rows = await db.prepare('SELECT key, value_json FROM store_settings').all() as Array<{
      key: string;
      value_json: string;
    }>;

    const settings: Record<string, any> = {};
    for (const row of rows) {
      try {
        settings[row.key] = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json;
      } catch {
        settings[row.key] = {};
      }
    }

    return {
      general: { ...DEFAULT_GENERAL_SETTINGS, ...(settings.general || {}) },
      contact: { ...DEFAULT_CONTACT_SETTINGS, ...(settings.contact || {}) },
      shipping: { ...DEFAULT_SHIPPING_SETTINGS, ...(settings.shipping || {}) },
      seo: { ...DEFAULT_SEO_SETTINGS, ...(settings.seo || {}) },
      notifications: { ...DEFAULT_NOTIFICATION_SETTINGS, ...(settings.notifications || {}) },
      orders: settings.orders || {},
      couriers: settings.couriers || {},
      email: settings.email || {},
      security: settings.security || {}
    };
  } catch (err) {
    console.error('Failed to load store settings from database:', err);
    return {
      general: DEFAULT_GENERAL_SETTINGS,
      contact: DEFAULT_CONTACT_SETTINGS,
      shipping: DEFAULT_SHIPPING_SETTINGS,
      seo: DEFAULT_SEO_SETTINGS,
      notifications: DEFAULT_NOTIFICATION_SETTINGS
    };
  }
}

/**
 * Helper to get active notification settings (admin alerts, WhatsApp credentials, toggles).
 */
export async function getStoreNotificationSettings(): Promise<NotificationSettings> {
  const all = await getAllStoreSettings();
  return (all.notifications as NotificationSettings) || DEFAULT_NOTIFICATION_SETTINGS;
}

/**
 * Returns public-safe store settings for the customer storefront.
 * Excludes SMTP secrets, admin alert emails, and internal security configs.
 */
export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  const all = await getAllStoreSettings();
  return {
    general: all.general as GeneralSettings,
    contact: all.contact as ContactSettings,
    shipping: all.shipping as ShippingSettings,
    seo: all.seo as SeoSettings
  };
}

/**
 * Lightweight helper to fetch active shipping parameters for fee calculations.
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  ensureDatabaseReady();
  const db = getDatabase();

  try {
    const row = await db.prepare(`SELECT value_json FROM store_settings WHERE key = 'shipping'`).get() as {
      value_json: string;
    } | undefined;

    if (row?.value_json) {
      const parsed = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json;
      return {
        ...DEFAULT_SHIPPING_SETTINGS,
        ...parsed,
        standard_shipping_fee: Number(parsed.standard_shipping_fee ?? DEFAULT_SHIPPING_SETTINGS.standard_shipping_fee),
        free_shipping_threshold: Number(parsed.free_shipping_threshold ?? DEFAULT_SHIPPING_SETTINGS.free_shipping_threshold),
        express_shipping_fee: Number(parsed.express_shipping_fee ?? DEFAULT_SHIPPING_SETTINGS.express_shipping_fee)
      };
    }
  } catch (err) {
    console.warn('Could not read shipping settings from database, using defaults:', err);
  }

  return DEFAULT_SHIPPING_SETTINGS;
}
