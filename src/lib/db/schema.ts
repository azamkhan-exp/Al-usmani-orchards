import { getDatabase } from './index';

export function initializeDatabaseSchema() {
  const db = getDatabase();

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
      email_verified INTEGER DEFAULT 0,
      last_login_at TEXT,
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      mfa_secret TEXT,
      mfa_recovery_codes_json TEXT,
      mfa_verified_at TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 2. USER SESSIONS
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 2B. PASSWORD RESET TOKENS
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 2C. OAUTH ACCOUNTS
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 4. MANGO VARIETIES
    CREATE TABLE IF NOT EXISTS mango_varieties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      origin_city TEXT NOT NULL,
      harvest_start_month INTEGER NOT NULL,
      harvest_end_month INTEGER NOT NULL,
      sweetness_brix REAL NOT NULL,
      aroma_level INTEGER NOT NULL CHECK(aroma_level BETWEEN 1 AND 10),
      fiber_level INTEGER NOT NULL CHECK(fiber_level BETWEEN 1 AND 10),
      acidity_level INTEGER NOT NULL CHECK(acidity_level BETWEEN 1 AND 10),
      description TEXT NOT NULL,
      flavor_notes TEXT,
      image_url TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
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
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_preorder_active INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'DRAFT', 'ARCHIVED', 'INACTIVE', 'OUT_OF_STOCK', 'SEASONAL', 'PREORDER')),
      primary_image TEXT NOT NULL,
      gallery_json TEXT DEFAULT '[]',
      seo_title TEXT,
      seo_description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 6. DYNAMIC PACKAGE SIZES
    CREATE TABLE IF NOT EXISTS package_sizes (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      base_price REAL NOT NULL,
      sale_price REAL,
      preorder_price REAL,
      wholesale_price REAL,
      min_order_qty INTEGER NOT NULL DEFAULT 1,
      max_order_qty INTEGER NOT NULL DEFAULT 50,
      sku TEXT UNIQUE NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- 7. FARM ORCHARDS
    CREATE TABLE IF NOT EXISTS farm_orchards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      total_acres REAL NOT NULL,
      manager_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      soil_type TEXT NOT NULL,
      irrigation_source TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      total_yield_kg REAL NOT NULL,
      available_kg REAL NOT NULL,
      reserved_kg REAL NOT NULL DEFAULT 0,
      sold_kg REAL NOT NULL DEFAULT 0,
      wastage_kg REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'HARVESTED' CHECK(status IN ('PLANNED', 'HARVESTED', 'CURING', 'PACKED', 'COMPLETED')),
      notes TEXT
    );

    -- 10. INVENTORY (By Package Size & Optional Batch)
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
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 11. INVENTORY TRANSACTIONS (Audit Ledger)
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 12. PRE-ORDER CAMPAIGNS
    CREATE TABLE IF NOT EXISTS preorder_campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      package_size_id TEXT NOT NULL REFERENCES package_sizes(id) ON DELETE CASCADE,
      regular_price REAL NOT NULL,
      preorder_price REAL NOT NULL,
      deposit_amount REAL NOT NULL,
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 13. PROMOTIONS & COUPONS
    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('PERCENTAGE', 'FIXED', 'TIERED', 'QUANTITY_BREAK')),
      discount_value REAL NOT NULL DEFAULT 0,
      min_order_value REAL NOT NULL DEFAULT 0,
      max_discount REAL,
      starts_at TEXT,
      expires_at TEXT,
      usage_limit INTEGER,
      times_used INTEGER NOT NULL DEFAULT 0,
      per_customer_limit INTEGER NOT NULL DEFAULT 1,
      is_stackable INTEGER NOT NULL DEFAULT 0,
      eligible_varieties_json TEXT DEFAULT '[]',
      eligible_packages_json TEXT DEFAULT '[]',
      customer_segment TEXT DEFAULT 'ALL',
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 14. TIERED DISCOUNT RULES
    CREATE TABLE IF NOT EXISTS tiered_discount_rules (
      id TEXT PRIMARY KEY,
      promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
      min_units INTEGER NOT NULL,
      max_units INTEGER,
      discount_percentage REAL NOT NULL
    );

    -- 15. CUSTOMERS (CRM)
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      city TEXT,
      notes TEXT,
      segment TEXT NOT NULL DEFAULT 'NEW' CHECK(segment IN ('NEW', 'RETURNING', 'VIP', 'HIGH_VALUE', 'AT_RISK')),
      total_spent REAL NOT NULL DEFAULT 0,
      orders_count INTEGER NOT NULL DEFAULT 0,
      preferred_variety_id TEXT REFERENCES mango_varieties(id) ON DELETE SET NULL,
      referral_code TEXT UNIQUE,
      referred_by TEXT REFERENCES customers(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 16. CUSTOMER ADDRESSES
    CREATE TABLE IF NOT EXISTS customer_addresses (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT 'Home',
      recipient_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      street_address TEXT NOT NULL,
      area TEXT,
      city TEXT NOT NULL,
      province TEXT NOT NULL DEFAULT 'Punjab',
      postal_code TEXT,
      is_default INTEGER NOT NULL DEFAULT 0
    );

    -- 17. COURIERS
    CREATE TABLE IF NOT EXISTS couriers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      tracking_url_template TEXT NOT NULL,
      logo_url TEXT,
      cod_supported INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1
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
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      shipping_fee REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING', 'AWAITING_VERIFICATION', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
      coupon_code TEXT,
      shipping_address_json TEXT NOT NULL,
      is_gift INTEGER NOT NULL DEFAULT 0,
      gift_recipient TEXT,
      gift_message TEXT,
      courier_id TEXT REFERENCES couriers(id) ON DELETE SET NULL,
      tracking_number TEXT,
      internal_notes TEXT,
      customer_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      unit_weight_kg REAL NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal REAL NOT NULL
    );

    -- 20. ORDER TIMELINE
    CREATE TABLE IF NOT EXISTS order_timeline (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 21. PAYMENTS
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_reference TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED')),
      gateway_response TEXT,
      verified_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 22. REFUNDS
    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PROCESSED' CHECK(status IN ('REQUESTED', 'APPROVED', 'PROCESSED', 'REJECTED')),
      processed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 23. SHIPMENTS
    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      courier_id TEXT NOT NULL REFERENCES couriers(id) ON DELETE RESTRICT,
      tracking_number TEXT UNIQUE NOT NULL,
      shipment_status TEXT NOT NULL DEFAULT 'BOOKED' CHECK(shipment_status IN ('BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED_TO_ORIGIN')),
      shipping_cost REAL NOT NULL DEFAULT 0,
      cod_amount REAL NOT NULL DEFAULT 0,
      pickup_date TEXT,
      estimated_delivery_date TEXT,
      actual_delivery_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 24. SHIPMENT TRACKING EVENTS
    CREATE TABLE IF NOT EXISTS shipment_tracking_events (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
      event_time TEXT NOT NULL DEFAULT (datetime('now')),
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

    -- 26. EXPENSES (P&L Tracking)
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      description TEXT NOT NULL,
      vendor_name TEXT,
      payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
      reference_no TEXT,
      created_by TEXT,
      receipt_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 27. ACCOUNTS RECEIVABLE (Pending COD / Wholesale)
    CREATE TABLE IF NOT EXISTS accounts_receivable (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
      debtor_type TEXT NOT NULL CHECK(debtor_type IN ('COURIER_COD', 'WHOLESALE_BUYER', 'CORPORATE_CLIENT')),
      debtor_name TEXT NOT NULL,
      amount_due REAL NOT NULL,
      amount_collected REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PARTIALLY_PAID', 'SETTLED', 'OVERDUE')),
      due_date TEXT NOT NULL,
      settled_at TEXT
    );

    -- 28. ACCOUNTS PAYABLE (Vendors / Suppliers)
    CREATE TABLE IF NOT EXISTS accounts_payable (
      id TEXT PRIMARY KEY,
      vendor_name TEXT NOT NULL,
      bill_no TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_due REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE')),
      due_date TEXT NOT NULL,
      paid_at TEXT
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
      balance_payable REAL NOT NULL DEFAULT 0
    );

    -- 30. WEBSITE CONTENT (CMS)
    CREATE TABLE IF NOT EXISTS website_content (
      id TEXT PRIMARY KEY,
      section_key TEXT UNIQUE NOT NULL,
      content_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 31. CUSTOMER REVIEWS
    CREATE TABLE IF NOT EXISTS customer_reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      customer_name TEXT NOT NULL,
      city TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      is_verified_purchase INTEGER NOT NULL DEFAULT 1,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 32. REFERRALS
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      referee_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
      reward_amount REAL NOT NULL DEFAULT 500,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'CREDITED', 'REDEEMED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 33. STORE SETTINGS
    CREATE TABLE IF NOT EXISTS store_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 34. NOTIFICATION LOGS
    CREATE TABLE IF NOT EXISTS notification_logs (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 26. PAYMENT METHODS (Global Configuration)
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL, -- 'COD', 'EASYPAISA', 'JAZZCASH', 'CARD'
      name TEXT NOT NULL,
      description TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      type TEXT NOT NULL DEFAULT 'MANUAL', -- 'CASH', 'MANUAL_TRANSFER', 'GATEWAY'
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 27. PAYMENT METHOD CONFIGURATIONS
    CREATE TABLE IF NOT EXISTS payment_method_configs (
      id TEXT PRIMARY KEY,
      payment_method_id TEXT NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
      config_key TEXT NOT NULL,
      config_value TEXT NOT NULL,
      is_secret INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(payment_method_id, config_key)
    );

    -- 28. PRODUCT PAYMENT METHOD OVERRIDES
    CREATE TABLE IF NOT EXISTS product_payment_methods (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      payment_method_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'INHERIT' CHECK(status IN ('INHERIT', 'ENABLED', 'DISABLED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(product_id, payment_method_code)
    );

    -- 29. PAYMENT TRANSACTIONS (Authoritative Ledger)
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      payment_method_code TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PKR',
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'AWAITING_VERIFICATION', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
      transaction_reference TEXT,
      payment_proof_url TEXT,
      gateway_provider TEXT,
      gateway_response_json TEXT,
      verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      verified_at TEXT,
      admin_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 35. PRODUCT IMAGES
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      storage_path TEXT,
      alt_text TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 36. AI KNOWLEDGE DOCUMENTS (RAG)
    CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL CHECK(category IN ('VARIETIES', 'ORCHARD_TERROIR', 'POLICIES', 'SHIPPING', 'PRICING_DEALS', 'STORAGE_RIPENING', 'FAQ')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags_json TEXT DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Performance & Integrity Indexes
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
    CREATE INDEX IF NOT EXISTS idx_pm_code ON payment_methods(code);
    -- 37. FEATURE FLAGS (Master Feature Control Architecture)
    CREATE TABLE IF NOT EXISTS feature_flags (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('CUSTOMER_EXPERIENCE', 'MARKETING', 'SALES_DELIVERY', 'COMMUNICATION', 'ORCHARD_CATALOG')),
      enabled INTEGER NOT NULL DEFAULT 1,
      customer_visible INTEGER NOT NULL DEFAULT 1,
      admin_visible INTEGER NOT NULL DEFAULT 1,
      configuration_json TEXT DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT
    );

    -- 38. CUSTOMER WISHLISTS
    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      package_size_id TEXT REFERENCES package_sizes(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(customer_id, product_id, package_size_id)
    );

    -- 39. BACK-IN-STOCK NOTIFICATION SUBSCRIPTIONS
    CREATE TABLE IF NOT EXISTS back_in_stock_subscriptions (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      package_size_id TEXT REFERENCES package_sizes(id) ON DELETE CASCADE,
      email TEXT,
      phone TEXT,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      notified INTEGER NOT NULL DEFAULT 0,
      notified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 40. LOYALTY ACCOUNTS & TRANSACTION LEDGER
    CREATE TABLE IF NOT EXISTS loyalty_accounts (
      id TEXT PRIMARY KEY,
      customer_id TEXT UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      points_balance INTEGER NOT NULL DEFAULT 0,
      lifetime_points INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'BRONZE' CHECK(tier IN ('BRONZE', 'SILVER', 'GOLD', 'VIP')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loyalty_ledger (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
      points INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED')),
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 41. ABANDONED CARTS
    CREATE TABLE IF NOT EXISTS abandoned_carts (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      email TEXT,
      phone TEXT,
      cart_items_json TEXT NOT NULL,
      total_amount REAL NOT NULL,
      recovery_token TEXT UNIQUE NOT NULL,
      reminder_count INTEGER NOT NULL DEFAULT 0,
      last_reminder_at TEXT,
      recovered_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 42. SMART DELIVERY ZONES
    CREATE TABLE IF NOT EXISTS delivery_zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cities_json TEXT NOT NULL DEFAULT '[]',
      delivery_fee REAL NOT NULL DEFAULT 350,
      free_delivery_threshold REAL NOT NULL DEFAULT 10000,
      estimated_days TEXT NOT NULL DEFAULT '1 - 2 business days',
      cod_available INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_international INTEGER NOT NULL DEFAULT 0,
      country_code TEXT DEFAULT 'PK'
    );

    -- 43. WHATSAPP TEMPLATES
    CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      event_trigger TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      status TEXT NOT NULL DEFAULT 'APPROVED',
      content_template TEXT NOT NULL,
      variables_json TEXT NOT NULL DEFAULT '[]',
      is_enabled INTEGER NOT NULL DEFAULT 1
    );

    -- 44. ADMIN OTP CODES (Cryptographic Multi-Factor Authentication)
    CREATE TABLE IF NOT EXISTS admin_otp_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'ADMIN_LOGIN' CHECK(purpose IN ('ADMIN_LOGIN', 'STEP_UP', 'PASSWORD_RESET')),
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      is_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 45. PAKISTAN LOCATIONS HIERARCHY
    CREATE TABLE IF NOT EXISTS pakistan_locations (
      id TEXT PRIMARY KEY,
      province TEXT NOT NULL,
      division TEXT,
      district TEXT NOT NULL,
      tehsil TEXT,
      city TEXT NOT NULL,
      area TEXT,
      postal_code TEXT,
      delivery_fee REAL NOT NULL DEFAULT 350,
      estimated_delivery_days TEXT NOT NULL DEFAULT '24 - 48 Hours',
      cod_available INTEGER NOT NULL DEFAULT 1,
      is_serviceable INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      courier_code TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    CREATE INDEX IF NOT EXISTS idx_pm_code ON payment_methods(code);
    CREATE INDEX IF NOT EXISTS idx_ppm_product ON product_payment_methods(product_id);
    CREATE INDEX IF NOT EXISTS idx_pt_order ON payment_transactions(order_id);
    CREATE INDEX IF NOT EXISTS idx_pt_status ON payment_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_product_images_prod ON product_images(product_id);
    CREATE INDEX IF NOT EXISTS idx_ai_docs_cat ON ai_knowledge_documents(category);
    CREATE INDEX IF NOT EXISTS idx_wishlists_cust ON wishlists(customer_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlists_cust_prod ON wishlists(customer_id, product_id);
    CREATE INDEX IF NOT EXISTS idx_back_in_stock_prod ON back_in_stock_subscriptions(product_id);
    CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_cust ON loyalty_ledger(customer_id);
    CREATE INDEX IF NOT EXISTS idx_abandoned_carts_token ON abandoned_carts(recovery_token);
    CREATE INDEX IF NOT EXISTS idx_otp_user_purpose ON admin_otp_codes(user_id, purpose, is_used);

    -- 46. ADMIN INVITATIONS
    CREATE TABLE IF NOT EXISTS admin_invitations (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'FINANCE_MANAGER', 'INVENTORY_MANAGER', 'ORDER_MANAGER', 'MARKETING_MANAGER', 'SUPPORT_AGENT')),
      token_hash TEXT UNIQUE NOT NULL,
      invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      expires_at TEXT NOT NULL,
      is_accepted INTEGER NOT NULL DEFAULT 0,
      accepted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_admin_inv_token ON admin_invitations(token_hash);
    CREATE INDEX IF NOT EXISTS idx_admin_inv_email ON admin_invitations(email);
  `;

  db.exec(ddl);

  // Safe runtime column migrations
  try {
    const courierColumns = db.prepare(`PRAGMA table_info(couriers)`).all() as Array<{ name: string }>;
    if (!courierColumns.some(c => c.name === 'logo_url')) {
      db.exec(`ALTER TABLE couriers ADD COLUMN logo_url TEXT;`);
    }

    const notifColumns = db.prepare(`PRAGMA table_info(notification_logs)`).all() as Array<{ name: string }>;
    if (!notifColumns.some(c => c.name === 'channel')) {
      db.exec(`ALTER TABLE notification_logs ADD COLUMN channel TEXT NOT NULL DEFAULT 'EMAIL';`);
    }
    if (!notifColumns.some(c => c.name === 'idempotency_key')) {
      db.exec(`ALTER TABLE notification_logs ADD COLUMN idempotency_key TEXT;`);
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idem ON notification_logs(idempotency_key);`);
    }
    if (!notifColumns.some(c => c.name === 'payload_json')) {
      db.exec(`ALTER TABLE notification_logs ADD COLUMN payload_json TEXT;`);
    }
    if (!notifColumns.some(c => c.name === 'is_demo')) {
      db.exec(`ALTER TABLE notification_logs ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;`);
    }

    // Customer Reviews runtime migrations
    const reviewColumns = db.prepare(`PRAGMA table_info(customer_reviews)`).all() as Array<{ name: string }>;
    if (!reviewColumns.some(c => c.name === 'customer_id')) {
      db.exec(`ALTER TABLE customer_reviews ADD COLUMN customer_id TEXT;`);
    }
    if (!reviewColumns.some(c => c.name === 'user_id')) {
      db.exec(`ALTER TABLE customer_reviews ADD COLUMN user_id TEXT;`);
    }
    if (!reviewColumns.some(c => c.name === 'order_id')) {
      db.exec(`ALTER TABLE customer_reviews ADD COLUMN order_id TEXT;`);
    }
    if (!reviewColumns.some(c => c.name === 'status')) {
      db.exec(`ALTER TABLE customer_reviews ADD COLUMN status TEXT NOT NULL DEFAULT 'APPROVED';`);
    }
    if (!reviewColumns.some(c => c.name === 'photos_json')) {
      db.exec(`ALTER TABLE customer_reviews ADD COLUMN photos_json TEXT DEFAULT '[]';`);
    }
    if (!reviewColumns.some(c => c.name === 'helpful_count')) {
      db.exec(`ALTER TABLE customer_reviews ADD COLUMN helpful_count INTEGER DEFAULT 0;`);
    }
    if (!reviewColumns.some(c => c.name === 'is_demo')) {
      db.exec(`ALTER TABLE customer_reviews ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;`);
    }

    // Orders runtime migrations: is_demo, is_archived, archived_at
    const orderColumns = db.prepare(`PRAGMA table_info(orders)`).all() as Array<{ name: string }>;
    if (!orderColumns.some(c => c.name === 'is_demo')) {
      db.exec(`ALTER TABLE orders ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!orderColumns.some(c => c.name === 'is_archived')) {
      db.exec(`ALTER TABLE orders ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!orderColumns.some(c => c.name === 'archived_at')) {
      db.exec(`ALTER TABLE orders ADD COLUMN archived_at TEXT;`);
    }
    db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_demo_arch ON orders(is_demo, is_archived);`);

    // Customers runtime migrations: is_demo, is_archived, archived_at
    const customerColumns = db.prepare(`PRAGMA table_info(customers)`).all() as Array<{ name: string }>;
    if (!customerColumns.some(c => c.name === 'is_demo')) {
      db.exec(`ALTER TABLE customers ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!customerColumns.some(c => c.name === 'is_archived')) {
      db.exec(`ALTER TABLE customers ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!customerColumns.some(c => c.name === 'archived_at')) {
      db.exec(`ALTER TABLE customers ADD COLUMN archived_at TEXT;`);
    }
    db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_demo ON customers(is_demo);`);

    // Users runtime migrations: security_phone, security_phone_verified
    const userColumns = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
    if (!userColumns.some(c => c.name === 'security_phone')) {
      db.exec(`ALTER TABLE users ADD COLUMN security_phone TEXT;`);
    }
    if (!userColumns.some(c => c.name === 'security_phone_verified')) {
      db.exec(`ALTER TABLE users ADD COLUMN security_phone_verified INTEGER NOT NULL DEFAULT 0;`);
    }
  } catch (e) {
    // Column may already exist
  }
}
