const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { Pool } = require('pg');

// 1. Read DATABASE_URL from .env.local without exposing it
const envPath = path.resolve('.env.local');
if (!fs.existsSync(envPath)) {
  console.error('[ERROR] .env.local not found');
  process.exit(1);
}

const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
let dbUrl = '';
for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    dbUrl = trimmed.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
  }
}

if (!dbUrl) {
  console.error('[ERROR] DATABASE_URL not set in .env.local');
  process.exit(1);
}

// 2. Connect to SQLite in READ-ONLY mode
const sqlitePath = path.resolve('data/shahi_orchards.db');
if (!fs.existsSync(sqlitePath)) {
  console.error('[ERROR] SQLite database file not found at:', sqlitePath);
  process.exit(1);
}

const sqliteDb = new DatabaseSync(sqlitePath, { readOnly: true });

// 3. Connect to Neon PostgreSQL
const pgPool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

const ORDERED_TABLES = [
  // Level 0: Roots
  'users',
  'mango_varieties',
  'couriers',
  'delivery_zones',
  'pakistan_locations',
  'expense_categories',
  'payment_methods',
  'website_content',
  'store_settings',
  'feature_flags',
  'ai_knowledge_documents',
  'whatsapp_templates',
  'vendors',

  // Level 1: Depend on roots
  'user_sessions',
  'password_reset_tokens',
  'accounts',
  'admin_audit_logs',
  'admin_otp_codes',
  'admin_invitations',
  'customers',
  'farm_orchards',
  'products',
  'expenses',
  'payment_method_configs',

  // Level 2
  'customer_addresses',
  'farm_blocks',
  'package_sizes',
  'product_images',
  'product_payment_methods',
  'promotions',
  'customer_reviews',
  'wishlists',
  'back_in_stock_subscriptions',
  'loyalty_accounts',
  'loyalty_ledger',
  'abandoned_carts',
  'referrals',

  // Level 3
  'harvest_batches',
  'inventory',
  'inventory_transactions',
  'preorder_campaigns',
  'tiered_discount_rules',
  'orders',

  // Level 4
  'order_items',
  'order_timeline',
  'payments',
  'payment_transactions',
  'refunds',
  'shipments',
  'shipment_tracking_events',
  'accounts_receivable',
  'accounts_payable',
  'notification_logs'
];

async function createPostgresSchema(client) {
  console.log('[MIGRATION] Creating PostgreSQL compatibility functions & schema...');

  // SQLite datetime('now') compatibility function
  await client.query(`
    CREATE OR REPLACE FUNCTION datetime(text_val TEXT DEFAULT 'now', modifier TEXT DEFAULT NULL)
    RETURNS TIMESTAMPTZ AS $$
    BEGIN
      IF modifier IS NULL OR modifier = '' THEN
        RETURN CURRENT_TIMESTAMP;
      ELSE
        BEGIN
          RETURN CURRENT_TIMESTAMP + CAST(modifier AS INTERVAL);
        EXCEPTION WHEN OTHERS THEN
          RETURN CURRENT_TIMESTAMP;
        END;
      END IF;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `);

  const ddl = `
    -- 1. USERS
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'ORDER_MANAGER', 'MARKETING_MANAGER', 'SUPPORT_AGENT', 'CUSTOMER')),
      phone TEXT,
      avatar_url TEXT,
      email_verified SMALLINT DEFAULT 0,
      last_login_at TIMESTAMPTZ,
      mfa_enabled SMALLINT NOT NULL DEFAULT 0,
      mfa_secret TEXT,
      mfa_recovery_codes_json TEXT,
      mfa_verified_at TIMESTAMPTZ,
      security_phone TEXT,
      security_phone_verified SMALLINT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. USER SESSIONS
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 2B. PASSWORD RESET TOKENS
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 2C. OAUTH ACCOUNTS
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at BIGINT,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(provider, provider_account_id)
    );

    -- 3. ADMIN AUDIT LOGS
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      user_email TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      previous_state TEXT,
      new_state TEXT,
      ip_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. MANGO VARIETIES
    CREATE TABLE IF NOT EXISTS mango_varieties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      origin_city TEXT NOT NULL,
      harvest_start_month INTEGER NOT NULL,
      harvest_end_month INTEGER NOT NULL,
      sweetness_brix NUMERIC(4, 1) NOT NULL,
      aroma_level INTEGER NOT NULL CHECK(aroma_level BETWEEN 1 AND 10),
      fiber_level INTEGER NOT NULL CHECK(fiber_level BETWEEN 1 AND 10),
      acidity_level INTEGER NOT NULL CHECK(acidity_level BETWEEN 1 AND 10),
      description TEXT NOT NULL,
      flavor_notes TEXT,
      image_url TEXT NOT NULL,
      is_active SMALLINT NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- 5. PRODUCTS
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      variety_id TEXT NOT NULL REFERENCES mango_varieties(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      tagline TEXT,
      description TEXT NOT NULL,
      grade TEXT NOT NULL DEFAULT 'Export Grade A+',
      harvest_season TEXT NOT NULL,
      ripeness_guide TEXT,
      storage_instructions TEXT,
      is_featured SMALLINT NOT NULL DEFAULT 0,
      is_preorder_active SMALLINT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'DRAFT', 'ARCHIVED', 'INACTIVE', 'OUT_OF_STOCK', 'SEASONAL', 'PREORDER')),
      primary_image TEXT NOT NULL,
      gallery_json TEXT DEFAULT '[]',
      seo_title TEXT,
      seo_description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. DYNAMIC PACKAGE SIZES
    CREATE TABLE IF NOT EXISTS package_sizes (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      weight_kg NUMERIC(6, 2) NOT NULL,
      base_price NUMERIC(12, 2) NOT NULL,
      sale_price NUMERIC(12, 2),
      preorder_price NUMERIC(12, 2),
      wholesale_price NUMERIC(12, 2),
      min_order_qty INTEGER NOT NULL DEFAULT 1,
      max_order_qty INTEGER NOT NULL DEFAULT 50,
      sku TEXT UNIQUE NOT NULL,
      is_active SMALLINT NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- 7. FARM ORCHARDS
    CREATE TABLE IF NOT EXISTS farm_orchards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      total_acres NUMERIC(8, 2) NOT NULL,
      manager_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      soil_type TEXT NOT NULL,
      irrigation_source TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. FARM BLOCKS
    CREATE TABLE IF NOT EXISTS farm_blocks (
      id TEXT PRIMARY KEY,
      orchard_id TEXT NOT NULL REFERENCES farm_orchards(id) ON DELETE CASCADE,
      block_code TEXT NOT NULL,
      variety_id TEXT NOT NULL REFERENCES mango_varieties(id) ON DELETE RESTRICT,
      tree_count INTEGER NOT NULL,
      planting_year INTEGER NOT NULL,
      soil_status TEXT NOT NULL DEFAULT 'Optimal Canal Silt'
    );

    -- 9. HARVEST BATCHES
    CREATE TABLE IF NOT EXISTS harvest_batches (
      id TEXT PRIMARY KEY,
      batch_code TEXT UNIQUE NOT NULL,
      variety_id TEXT NOT NULL REFERENCES mango_varieties(id) ON DELETE RESTRICT,
      orchard_id TEXT NOT NULL REFERENCES farm_orchards(id) ON DELETE RESTRICT,
      block_id TEXT REFERENCES farm_blocks(id) ON DELETE SET NULL,
      harvest_date TEXT NOT NULL,
      expected_dispatch_date TEXT NOT NULL,
      expected_delivery_date TEXT,
      total_yield_kg NUMERIC(10, 2) NOT NULL,
      available_kg NUMERIC(10, 2) NOT NULL,
      reserved_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
      sold_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
      wastage_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'HARVESTED' CHECK(status IN ('PLANNED', 'HARVESTED', 'CURING', 'PACKED', 'COMPLETED')),
      notes TEXT
    );

    -- 10. INVENTORY
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      package_size_id TEXT NOT NULL REFERENCES package_sizes(id) ON DELETE CASCADE,
      batch_id TEXT REFERENCES harvest_batches(id) ON DELETE SET NULL,
      total_stock INTEGER NOT NULL DEFAULT 0,
      available_stock INTEGER NOT NULL DEFAULT 0,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      sold_stock INTEGER NOT NULL DEFAULT 0,
      damaged_stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 10,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. INVENTORY TRANSACTIONS
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id TEXT PRIMARY KEY,
      package_size_id TEXT NOT NULL REFERENCES package_sizes(id) ON DELETE CASCADE,
      batch_id TEXT REFERENCES harvest_batches(id) ON DELETE SET NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('INITIAL_LOAD', 'PURCHASE_RESERVE', 'ORDER_COMMIT', 'ORDER_CANCEL_RELEASE', 'REFUND_RESTOCK', 'DAMAGE_WRITE_OFF', 'MANUAL_ADJUST')),
      quantity INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reason TEXT NOT NULL,
      reference_id TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 12. PRE-ORDER CAMPAIGNS
    CREATE TABLE IF NOT EXISTS preorder_campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      package_size_id TEXT NOT NULL REFERENCES package_sizes(id) ON DELETE CASCADE,
      regular_price NUMERIC(12, 2) NOT NULL,
      preorder_price NUMERIC(12, 2) NOT NULL,
      deposit_amount NUMERIC(12, 2) NOT NULL,
      min_qty INTEGER NOT NULL DEFAULT 1,
      max_qty INTEGER NOT NULL DEFAULT 20,
      total_capacity INTEGER NOT NULL,
      reserved_count INTEGER NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      expected_harvest_date TEXT NOT NULL,
      expected_dispatch_date TEXT NOT NULL,
      estimated_delivery_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'HARVEST_READY', 'DISPATCHING', 'COMPLETED', 'CANCELLED')),
      customer_terms TEXT,
      banner_image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. PROMOTIONS & COUPONS
    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('PERCENTAGE', 'FIXED', 'TIERED', 'QUANTITY_BREAK')),
      discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
      min_order_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
      max_discount NUMERIC(12, 2),
      starts_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      usage_limit INTEGER,
      times_used INTEGER NOT NULL DEFAULT 0,
      per_customer_limit INTEGER NOT NULL DEFAULT 1,
      is_stackable SMALLINT NOT NULL DEFAULT 0,
      eligible_varieties_json TEXT DEFAULT '[]',
      eligible_packages_json TEXT DEFAULT '[]',
      customer_segment TEXT DEFAULT 'ALL',
      is_active SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ
    );

    -- 14. TIERED DISCOUNT RULES
    CREATE TABLE IF NOT EXISTS tiered_discount_rules (
      id TEXT PRIMARY KEY,
      promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
      min_units INTEGER NOT NULL,
      max_units INTEGER,
      discount_percentage NUMERIC(6, 2) NOT NULL
    );

    -- 15. CUSTOMERS
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      city TEXT,
      notes TEXT,
      segment TEXT NOT NULL DEFAULT 'NEW' CHECK(segment IN ('NEW', 'RETURNING', 'VIP', 'HIGH_VALUE', 'AT_RISK')),
      total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
      orders_count INTEGER NOT NULL DEFAULT 0,
      preferred_variety_id TEXT REFERENCES mango_varieties(id) ON DELETE SET NULL,
      referral_code TEXT UNIQUE,
      referred_by TEXT REFERENCES customers(id) ON DELETE SET NULL,
      is_demo SMALLINT NOT NULL DEFAULT 0,
      is_archived SMALLINT NOT NULL DEFAULT 0,
      archived_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 16. CUSTOMER ADDRESSES
    CREATE TABLE IF NOT EXISTS customer_addresses (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT 'Home',
      recipient_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      street_address TEXT NOT NULL,
      address_line_2 TEXT,
      area TEXT,
      city TEXT NOT NULL,
      province TEXT NOT NULL DEFAULT 'Punjab',
      postal_code TEXT,
      is_default SMALLINT NOT NULL DEFAULT 0
    );

    -- 17. COURIERS
    CREATE TABLE IF NOT EXISTS couriers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      tracking_url_template TEXT NOT NULL,
      logo_url TEXT,
      cod_supported SMALLINT NOT NULL DEFAULT 1,
      is_active SMALLINT NOT NULL DEFAULT 1
    );

    -- 18. ORDERS
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      guest_email TEXT,
      guest_name TEXT,
      guest_phone TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN (
        'PENDING', 'CONFIRMED', 'PAYMENT_PENDING', 'PAID', 'PROCESSING',
        'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY',
        'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED', 'FAILED'
      )),
      subtotal NUMERIC(12, 2) NOT NULL,
      discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
      tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(12, 2) NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING', 'AWAITING_VERIFICATION', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
      coupon_code TEXT,
      shipping_address_json TEXT NOT NULL,
      is_gift SMALLINT NOT NULL DEFAULT 0,
      gift_recipient TEXT,
      gift_message TEXT,
      courier_id TEXT REFERENCES couriers(id) ON DELETE SET NULL,
      tracking_number TEXT,
      internal_notes TEXT,
      customer_notes TEXT,
      is_demo SMALLINT NOT NULL DEFAULT 0,
      is_archived SMALLINT NOT NULL DEFAULT 0,
      archived_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 19. ORDER ITEMS
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      package_size_id TEXT NOT NULL REFERENCES package_sizes(id) ON DELETE RESTRICT,
      batch_id TEXT REFERENCES harvest_batches(id) ON DELETE SET NULL,
      variety_name TEXT NOT NULL,
      package_name TEXT NOT NULL,
      unit_weight_kg NUMERIC(6, 2) NOT NULL,
      unit_price NUMERIC(12, 2) NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal NUMERIC(12, 2) NOT NULL
    );

    -- 20. ORDER TIMELINE
    CREATE TABLE IF NOT EXISTS order_timeline (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 21. PAYMENTS
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_reference TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED')),
      gateway_response TEXT,
      verified_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 22. REFUNDS
    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PROCESSED' CHECK(status IN ('REQUESTED', 'APPROVED', 'PROCESSED', 'REJECTED')),
      processed_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 23. SHIPMENTS
    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      courier_id TEXT NOT NULL REFERENCES couriers(id) ON DELETE RESTRICT,
      tracking_number TEXT UNIQUE NOT NULL,
      shipment_status TEXT NOT NULL DEFAULT 'BOOKED' CHECK(shipment_status IN ('BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED_TO_ORIGIN')),
      shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
      cod_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      pickup_date TEXT,
      estimated_delivery_date TEXT,
      actual_delivery_date TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 24. SHIPMENT TRACKING EVENTS
    CREATE TABLE IF NOT EXISTS shipment_tracking_events (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
      event_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL
    );

    -- 25. EXPENSE CATEGORIES
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );

    -- 26. EXPENSES
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
      amount NUMERIC(12, 2) NOT NULL,
      expense_date TEXT NOT NULL,
      description TEXT NOT NULL,
      vendor_name TEXT,
      payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
      reference_no TEXT,
      created_by TEXT,
      receipt_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 27. ACCOUNTS RECEIVABLE
    CREATE TABLE IF NOT EXISTS accounts_receivable (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
      debtor_type TEXT NOT NULL CHECK(debtor_type IN ('COURIER_COD', 'WHOLESALE_BUYER', 'CORPORATE_CLIENT')),
      debtor_name TEXT NOT NULL,
      amount_due NUMERIC(12, 2) NOT NULL,
      amount_collected NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PARTIALLY_PAID', 'SETTLED', 'OVERDUE')),
      due_date TEXT NOT NULL,
      settled_at TIMESTAMPTZ
    );

    -- 28. ACCOUNTS PAYABLE
    CREATE TABLE IF NOT EXISTS accounts_payable (
      id TEXT PRIMARY KEY,
      vendor_name TEXT NOT NULL,
      bill_no TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_due NUMERIC(12, 2) NOT NULL,
      amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE')),
      due_date TEXT NOT NULL,
      paid_at TIMESTAMPTZ
    );

    -- 29. VENDORS
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      balance_payable NUMERIC(12, 2) NOT NULL DEFAULT 0
    );

    -- 30. WEBSITE CONTENT (CMS)
    CREATE TABLE IF NOT EXISTS website_content (
      id TEXT PRIMARY KEY,
      section_key TEXT UNIQUE NOT NULL,
      content_json TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 31. CUSTOMER REVIEWS
    CREATE TABLE IF NOT EXISTS customer_reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      customer_id TEXT,
      user_id TEXT,
      order_id TEXT,
      customer_name TEXT NOT NULL,
      city TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      photos_json TEXT DEFAULT '[]',
      is_verified_purchase SMALLINT NOT NULL DEFAULT 1,
      is_approved SMALLINT NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'APPROVED',
      helpful_count INTEGER DEFAULT 0,
      is_demo SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 32. REFERRALS
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      referee_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
      reward_amount NUMERIC(12, 2) NOT NULL DEFAULT 500,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'CREDITED', 'REDEEMED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 33. STORE SETTINGS
    CREATE TABLE IF NOT EXISTS store_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 34. NOTIFICATION LOGS
    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'EMAIL',
      idempotency_key TEXT,
      payload_json TEXT,
      status TEXT NOT NULL,
      error TEXT,
      is_demo SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 35. PAYMENT METHODS
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_enabled SMALLINT NOT NULL DEFAULT 1,
      type TEXT NOT NULL DEFAULT 'MANUAL',
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 36. PAYMENT METHOD CONFIGURATIONS
    CREATE TABLE IF NOT EXISTS payment_method_configs (
      id TEXT PRIMARY KEY,
      payment_method_id TEXT NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
      config_key TEXT NOT NULL,
      config_value TEXT NOT NULL,
      is_secret SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(payment_method_id, config_key)
    );

    -- 37. PRODUCT PAYMENT METHOD OVERRIDES
    CREATE TABLE IF NOT EXISTS product_payment_methods (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      payment_method_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'INHERIT' CHECK(status IN ('INHERIT', 'ENABLED', 'DISABLED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(product_id, payment_method_code)
    );

    -- 38. PAYMENT TRANSACTIONS
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      payment_method_code TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PKR',
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'AWAITING_VERIFICATION', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
      transaction_reference TEXT,
      payment_proof_url TEXT,
      gateway_provider TEXT,
      gateway_response_json TEXT,
      verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      verified_at TIMESTAMPTZ,
      admin_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 39. PRODUCT IMAGES
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      storage_path TEXT,
      alt_text TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 40. AI KNOWLEDGE DOCUMENTS
    CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL CHECK(category IN ('VARIETIES', 'ORCHARD_TERROIR', 'POLICIES', 'SHIPPING', 'PRICING_DEALS', 'STORAGE_RIPENING', 'FAQ')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags_json TEXT DEFAULT '[]',
      is_active SMALLINT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 41. FEATURE FLAGS
    CREATE TABLE IF NOT EXISTS feature_flags (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('CUSTOMER_EXPERIENCE', 'MARKETING', 'SALES_DELIVERY', 'COMMUNICATION', 'ORCHARD_CATALOG')),
      enabled SMALLINT NOT NULL DEFAULT 1,
      customer_visible SMALLINT NOT NULL DEFAULT 1,
      admin_visible SMALLINT NOT NULL DEFAULT 1,
      configuration_json TEXT DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT
    );

    -- 42. CUSTOMER WISHLISTS
    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      package_size_id TEXT REFERENCES package_sizes(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(customer_id, product_id, package_size_id)
    );

    -- 43. BACK IN STOCK SUBSCRIPTIONS
    CREATE TABLE IF NOT EXISTS back_in_stock_subscriptions (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      package_size_id TEXT REFERENCES package_sizes(id) ON DELETE CASCADE,
      email TEXT,
      phone TEXT,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      notified SMALLINT NOT NULL DEFAULT 0,
      notified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 44. LOYALTY ACCOUNTS
    CREATE TABLE IF NOT EXISTS loyalty_accounts (
      id TEXT PRIMARY KEY,
      customer_id TEXT UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      points_balance INTEGER NOT NULL DEFAULT 0,
      lifetime_points INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'BRONZE' CHECK(tier IN ('BRONZE', 'SILVER', 'GOLD', 'VIP')),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 45. LOYALTY LEDGER
    CREATE TABLE IF NOT EXISTS loyalty_ledger (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
      points INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED')),
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 46. ABANDONED CARTS
    CREATE TABLE IF NOT EXISTS abandoned_carts (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      email TEXT,
      phone TEXT,
      cart_items_json TEXT NOT NULL,
      total_amount NUMERIC(12, 2) NOT NULL,
      recovery_token TEXT UNIQUE NOT NULL,
      reminder_count INTEGER NOT NULL DEFAULT 0,
      last_reminder_at TIMESTAMPTZ,
      recovered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 47. SMART DELIVERY ZONES
    CREATE TABLE IF NOT EXISTS delivery_zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cities_json TEXT NOT NULL DEFAULT '[]',
      delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 350,
      free_delivery_threshold NUMERIC(12, 2) NOT NULL DEFAULT 10000,
      estimated_days TEXT NOT NULL DEFAULT '1 - 2 business days',
      cod_available SMALLINT NOT NULL DEFAULT 1,
      is_active SMALLINT NOT NULL DEFAULT 1,
      is_international SMALLINT NOT NULL DEFAULT 0,
      country_code TEXT DEFAULT 'PK'
    );

    -- 48. WHATSAPP TEMPLATES
    CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      event_trigger TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      status TEXT NOT NULL DEFAULT 'APPROVED',
      content_template TEXT NOT NULL,
      variables_json TEXT NOT NULL DEFAULT '[]',
      is_enabled SMALLINT NOT NULL DEFAULT 1
    );

    -- 49. ADMIN OTP CODES
    CREATE TABLE IF NOT EXISTS admin_otp_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'ADMIN_LOGIN' CHECK(purpose IN ('ADMIN_LOGIN', 'STEP_UP', 'PASSWORD_RESET')),
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      is_used SMALLINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 50. PAKISTAN LOCATIONS HIERARCHY
    CREATE TABLE IF NOT EXISTS pakistan_locations (
      id TEXT PRIMARY KEY,
      province TEXT NOT NULL,
      division TEXT,
      district TEXT NOT NULL,
      tehsil TEXT,
      city TEXT NOT NULL,
      area TEXT,
      postal_code TEXT,
      delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 350,
      estimated_delivery_days TEXT NOT NULL DEFAULT '24 - 48 Hours',
      cod_available SMALLINT NOT NULL DEFAULT 1,
      is_serviceable SMALLINT NOT NULL DEFAULT 1,
      is_active SMALLINT NOT NULL DEFAULT 1,
      courier_code TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 51. ADMIN INVITATIONS
    CREATE TABLE IF NOT EXISTS admin_invitations (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'ORDER_MANAGER', 'MARKETING_MANAGER', 'SUPPORT_AGENT')),
      token_hash TEXT UNIQUE NOT NULL,
      invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      is_accepted SMALLINT NOT NULL DEFAULT 0,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Performance & Integrity Indexes
    CREATE INDEX IF NOT EXISTS idx_locations_prov_dist ON pakistan_locations(province, district);
    CREATE INDEX IF NOT EXISTS idx_locations_city ON pakistan_locations(city);
    CREATE INDEX IF NOT EXISTS idx_locations_active_serv ON pakistan_locations(is_active, is_serviceable);
    CREATE INDEX IF NOT EXISTS idx_products_variety ON products(variety_id);
    CREATE INDEX IF NOT EXISTS idx_packages_product ON package_sizes(product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_package ON inventory(package_size_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON admin_audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
    CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
    CREATE INDEX IF NOT EXISTS idx_inventory_tx_package ON inventory_transactions(package_size_id);
    CREATE INDEX IF NOT EXISTS idx_preorders_product ON preorder_campaigns(product_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_order ON notification_logs(order_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notification_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_idem ON notification_logs(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_pm_code ON payment_methods(code);
    CREATE INDEX IF NOT EXISTS idx_ppm_product ON product_payment_methods(product_id);
    CREATE INDEX IF NOT EXISTS idx_pt_order ON payment_transactions(order_id);
    CREATE INDEX IF NOT EXISTS idx_pt_status ON payment_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_product_images_prod ON product_images(product_id);
    CREATE INDEX IF NOT EXISTS idx_ai_docs_cat ON ai_knowledge_documents(category);
    CREATE INDEX IF NOT EXISTS idx_wishlists_cust ON wishlists(customer_id);
    CREATE INDEX IF NOT EXISTS idx_back_in_stock_prod ON back_in_stock_subscriptions(product_id);
    CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_cust ON loyalty_ledger(customer_id);
    CREATE INDEX IF NOT EXISTS idx_abandoned_carts_token ON abandoned_carts(recovery_token);
    CREATE INDEX IF NOT EXISTS idx_otp_user_purpose ON admin_otp_codes(user_id, purpose, is_used);
    CREATE INDEX IF NOT EXISTS idx_admin_inv_token ON admin_invitations(token_hash);
    CREATE INDEX IF NOT EXISTS idx_admin_inv_email ON admin_invitations(email);
    CREATE INDEX IF NOT EXISTS idx_orders_demo_arch ON orders(is_demo, is_archived);
    CREATE INDEX IF NOT EXISTS idx_customers_demo ON customers(is_demo);
  `;

  await client.query(ddl);
  console.log('[MIGRATION] PostgreSQL schema provisioned successfully.');
}

async function migrateTable(client, tableName) {
  // 1. Fetch all rows and column names from SQLite
  const sqliteRows = sqliteDb.prepare(`SELECT * FROM "${tableName}"`).all();
  if (sqliteRows.length === 0) {
    return { sqliteCount: 0, pgCount: 0, status: 'EMPTY_OK' };
  }

  // Get column names from first row
  const columns = Object.keys(sqliteRows[0]);
  const colList = columns.map(c => `"${c}"`).join(', ');

  // Insert in chunks
  const CHUNK_SIZE = 50;
  for (let i = 0; i < sqliteRows.length; i += CHUNK_SIZE) {
    const chunk = sqliteRows.slice(i, i + CHUNK_SIZE);
    
    for (const row of chunk) {
      const values = columns.map(c => row[c]);
      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const insertSql = `
        INSERT INTO "${tableName}" (${colList})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      await client.query(insertSql, values);
    }
  }

  // Verify row count in PostgreSQL
  const pgCountRes = await client.query(`SELECT count(*)::int as c FROM "${tableName}"`);
  const pgCount = pgCountRes.rows[0].c;

  return {
    sqliteCount: sqliteRows.length,
    pgCount: pgCount,
    status: pgCount === sqliteRows.length ? 'MATCH' : (pgCount > sqliteRows.length ? 'PG_SUPERSET' : 'MISMATCH')
  };
}

async function runMigration() {
  console.log('===============================================================');
  console.log('  AL USMANI ORCHARDS: SQLITE -> NEON POSTGRESQL DATA MIGRATION');
  console.log('===============================================================');

  const client = await pgPool.connect();
  const report = [];

  try {
    await createPostgresSchema(client);

    console.log('[MIGRATION] Transferring data for 53 tables in dependency order...');

    for (const table of ORDERED_TABLES) {
      process.stdout.write(`  Migrating ${table.padEnd(30)}... `);
      const res = await migrateTable(client, table);
      report.push({ table, ...res });
      console.log(`[${res.status}] (SQLite: ${res.sqliteCount} -> PG: ${res.pgCount})`);
    }

    console.log('\n===============================================================');
    console.log('                     MIGRATION VERIFICATION REPORT             ');
    console.log('===============================================================');
    console.log('TABLE NAME                     | SQLITE ROWS | POSTGRES ROWS | STATUS');
    console.log('-------------------------------+-------------+---------------+-------');
    
    let totalSqlite = 0;
    let totalPg = 0;
    let anyMismatch = false;

    for (const r of report) {
      totalSqlite += r.sqliteCount;
      totalPg += r.pgCount;
      if (r.status === 'MISMATCH') anyMismatch = true;
      console.log(
        `${r.table.padEnd(30)} | ${String(r.sqliteCount).padStart(11)} | ${String(r.pgCount).padStart(13)} | ${r.status}`
      );
    }

    console.log('-------------------------------+-------------+---------------+-------');
    console.log(
      `TOTAL (${report.length} TABLES)`.padEnd(30) +
      ` | ${String(totalSqlite).padStart(11)} | ${String(totalPg).padStart(13)} | ${anyMismatch ? 'FAILED' : 'SUCCESS'}`
    );
    console.log('===============================================================');

    if (anyMismatch) {
      console.error('[ERROR] One or more tables had row count mismatches.');
      process.exit(1);
    } else {
      console.log('[SUCCESS] All 53 tables successfully migrated to Neon PostgreSQL!');
    }

  } catch (err) {
    console.error('[FATAL MIGRATION ERROR]:', err);
    process.exit(1);
  } finally {
    client.release();
    await pgPool.end();
  }
}

runMigration();
