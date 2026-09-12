import { initializeDatabaseSchema } from './schema';
import { seedDatabase } from './seed';
import { getDatabase } from './index';

declare global {
  // eslint-disable-next-line no-var
  var __auo_db_ready: boolean | undefined;
}

function applyRuntimeMigrations() {
  try {
    initializeDatabaseSchema();
    const db = getDatabase();

    // Check users table columns
    const userColumns = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
    const userColNames = new Set(userColumns.map(c => c.name));

    if (!userColNames.has('username')) {
      db.prepare(`ALTER TABLE users ADD COLUMN username TEXT`).run();
    }
    if (!userColNames.has('avatar_url')) {
      db.prepare(`ALTER TABLE users ADD COLUMN avatar_url TEXT`).run();
    }
    if (!userColNames.has('email_verified')) {
      db.prepare(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`).run();
    }
    if (!userColNames.has('last_login_at')) {
      db.prepare(`ALTER TABLE users ADD COLUMN last_login_at TEXT`).run();
    }
    if (!userColNames.has('mfa_enabled')) {
      db.prepare(`ALTER TABLE users ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0`).run();
    }
    if (!userColNames.has('mfa_secret')) {
      db.prepare(`ALTER TABLE users ADD COLUMN mfa_secret TEXT`).run();
    }
    if (!userColNames.has('mfa_recovery_codes_json')) {
      db.prepare(`ALTER TABLE users ADD COLUMN mfa_recovery_codes_json TEXT`).run();
    }
    if (!userColNames.has('mfa_verified_at')) {
      db.prepare(`ALTER TABLE users ADD COLUMN mfa_verified_at TEXT`).run();
    }

    // Ensure default admin username
    try {
      db.prepare(`
        UPDATE users 
        SET username = 'admin' 
        WHERE email = 'admin@alusmaniorchards.pk' AND (username IS NULL OR username = '')
      `).run();
    } catch {
      // Ignore if conflicting
    }

    // Check customer_addresses table columns
    const addressColumns = db.prepare(`PRAGMA table_info(customer_addresses)`).all() as Array<{ name: string }>;
    const addressColNames = new Set(addressColumns.map(c => c.name));
    if (!addressColNames.has('address_line_2')) {
      db.prepare(`ALTER TABLE customer_addresses ADD COLUMN address_line_2 TEXT`).run();
    }

    // Check promotions table columns
    const promoColumns = db.prepare(`PRAGMA table_info(promotions)`).all() as Array<{ name: string }>;
    const promoColNames = new Set(promoColumns.map(c => c.name));
    if (!promoColNames.has('updated_at')) {
      db.prepare(`ALTER TABLE promotions ADD COLUMN updated_at TEXT`).run();
    }

    // Check orders table for legacy restrictive check constraint
    try {
      const ordersDdl = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'").get() as { sql: string } | undefined;
      if (ordersDdl && ordersDdl.sql && (ordersDdl.sql.includes("'COD', 'BANK_TRANSFER', 'ONLINE_CARD'") || !ordersDdl.sql.includes('AWAITING_VERIFICATION'))) {
        db.exec(`
          PRAGMA foreign_keys=off;
          PRAGMA legacy_alter_table=on;
          ALTER TABLE orders RENAME TO _orders_old;
          
          CREATE TABLE orders (
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

          INSERT INTO orders (
            id, order_number, customer_id, guest_email, guest_name, guest_phone,
            status, subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
            payment_method, payment_status, coupon_code, shipping_address_json,
            is_gift, gift_recipient, gift_message, courier_id, tracking_number,
            internal_notes, customer_notes, created_at, updated_at
          )
          SELECT 
            id, order_number, customer_id, guest_email, guest_name, guest_phone,
            status, subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
            payment_method, payment_status, coupon_code, shipping_address_json,
            is_gift, gift_recipient, gift_message, courier_id, tracking_number,
            internal_notes, customer_notes, created_at, updated_at
          FROM _orders_old;

          DROP TABLE _orders_old;
          PRAGMA legacy_alter_table=off;
          PRAGMA foreign_keys=on;
        `);
      }

      // Repair any tables that might have been renamed to reference _orders_old
      const allDbTables = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type='table'`).all() as Array<{ name: string; sql: string }>;
      for (const t of allDbTables) {
        if (t.sql && t.sql.includes('_orders_old')) {
          const fixedSql = t.sql.replace(/_orders_old/g, 'orders');
          db.exec(`
            PRAGMA foreign_keys=off;
            PRAGMA legacy_alter_table=on;
            ALTER TABLE ${t.name} RENAME TO _tmp_${t.name};
            ${fixedSql};
            INSERT INTO ${t.name} SELECT * FROM _tmp_${t.name};
            DROP TABLE _tmp_${t.name};
            PRAGMA legacy_alter_table=off;
            PRAGMA foreign_keys=on;
          `);
        }
      }
    } catch (orderMigErr) {
      console.error('Error migrating orders table schema:', orderMigErr);
    }

    // Check if payment_methods table exists, if not initialize schema
    const pmTable = db.prepare(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='payment_methods'"
    ).get() as { count: number };
    if (!pmTable || pmTable.count === 0) {
      initializeDatabaseSchema();
    }

    // Seed default payment methods if none exist
    try {
      const pmCount = db.prepare("SELECT count(*) as count FROM payment_methods").get() as { count: number };
      if (!pmCount || pmCount.count === 0) {
        const insertPm = db.prepare(`
          INSERT INTO payment_methods (id, code, name, description, is_enabled, type, display_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        const insertConfig = db.prepare(`
          INSERT INTO payment_method_configs (id, payment_method_id, config_key, config_value, is_secret, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);

        // 1. Cash on Delivery (COD)
        const codId = 'pm_cod';
        insertPm.run(codId, 'COD', 'Cash on Delivery (COD)', 'Pay in cash when your fresh mangoes are delivered to your doorstep.', 1, 'MANUAL', 1);
        insertConfig.run('cfg_cod_1', codId, 'instructions', 'Pay in cash upon delivery to the courier rider. Please have exact change ready.', 0);
        insertConfig.run('cfg_cod_2', codId, 'min_amount', '0', 0);
        insertConfig.run('cfg_cod_3', codId, 'max_amount', '100000', 0);

        // 2. EasyPaisa
        const epId = 'pm_easypaisa';
        insertPm.run(epId, 'EASYPAISA', 'EasyPaisa Mobile Transfer', 'Send payment directly to our official EasyPaisa wallet.', 1, 'MANUAL', 2);
        insertConfig.run('cfg_ep_1', epId, 'account_name', 'Al Usmani Orchards', 0);
        insertConfig.run('cfg_ep_2', epId, 'account_number', '03001234567', 0);
        insertConfig.run('cfg_ep_3', epId, 'instructions', 'Send payment via EasyPaisa app to 03001234567 (Title: Al Usmani Orchards). After sending, enter the Transaction ID (TID) below.', 0);

        // 3. JazzCash
        const jcId = 'pm_jazzcash';
        insertPm.run(jcId, 'JAZZCASH', 'JazzCash Mobile Transfer', 'Transfer payment to our registered JazzCash account.', 1, 'MANUAL', 3);
        insertConfig.run('cfg_jc_1', jcId, 'account_name', 'Al Usmani Orchards', 0);
        insertConfig.run('cfg_jc_2', jcId, 'account_number', '03017654321', 0);
        insertConfig.run('cfg_jc_3', jcId, 'instructions', 'Send payment via JazzCash app to 03017654321 (Title: Al Usmani Orchards). After sending, enter the Transaction ID (TID) below.', 0);

        // 4. Card Payments
        const cardId = 'pm_card';
        insertPm.run(cardId, 'CARD', 'Credit / Debit Card (Visa / Mastercard)', 'Secure online card payments via direct checkout gateway.', 0, 'GATEWAY', 4);
        insertConfig.run('cfg_card_1', cardId, 'provider', 'stripe', 0);
        insertConfig.run('cfg_card_2', cardId, 'publishable_key', '', 0);
        insertConfig.run('cfg_card_3', cardId, 'secret_key', '', 1);
        insertConfig.run('cfg_card_4', cardId, 'webhook_secret', '', 1);
        insertConfig.run('cfg_card_5', cardId, 'mode', 'test', 0);
      }
    } catch (seedErr) {
      console.error('Error seeding payment methods:', seedErr);
    }

    // Ensure all critical performance indexes exist
    db.exec(`
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
      CREATE INDEX IF NOT EXISTS idx_pm_code ON payment_methods(code);
      CREATE INDEX IF NOT EXISTS idx_ppm_product ON product_payment_methods(product_id);
      CREATE INDEX IF NOT EXISTS idx_pt_order ON payment_transactions(order_id);
      CREATE INDEX IF NOT EXISTS idx_pt_status ON payment_transactions(status);
    `);

    // 35. Ensure PRODUCT IMAGES table & backfill from products
    db.exec(`
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
      CREATE INDEX IF NOT EXISTS idx_product_images_prod ON product_images(product_id);
    `);

    try {
      const pimgCount = db.prepare('SELECT count(*) as count FROM product_images').get() as { count: number };
      if (!pimgCount || pimgCount.count === 0) {
        db.exec(`
          INSERT INTO product_images (id, product_id, image_url, storage_path, alt_text, sort_order, is_primary, created_at)
          SELECT 
            'pimg_' || substr(id, 6) || '_1',
            id,
            primary_image,
            NULL,
            name || ' - Royal Harvest',
            0,
            1,
            datetime('now')
          FROM products
          WHERE primary_image IS NOT NULL AND primary_image != '';
        `);
      }
    } catch (pimgErr) {
      console.warn('Error backfilling product_images:', pimgErr);
    }

    // 36. Ensure NOTIFICATION LOGS columns
    try {
      const notifCols = db.prepare(`PRAGMA table_info(notification_logs)`).all() as Array<{ name: string }>;
      const notifSet = new Set(notifCols.map(c => c.name));
      if (!notifSet.has('channel')) {
        db.exec(`ALTER TABLE notification_logs ADD COLUMN channel TEXT NOT NULL DEFAULT 'EMAIL';`);
      }
      if (!notifSet.has('idempotency_key')) {
        db.exec(`ALTER TABLE notification_logs ADD COLUMN idempotency_key TEXT;`);
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idem ON notification_logs(idempotency_key);`);
      }
      if (!notifSet.has('payload_json')) {
        db.exec(`ALTER TABLE notification_logs ADD COLUMN payload_json TEXT;`);
      }
    } catch (notifErr) {
      console.warn('Error updating notification_logs schema:', notifErr);
    }

    // 37. Ensure AI KNOWLEDGE DOCUMENTS table & seed
    db.exec(`
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
      CREATE INDEX IF NOT EXISTS idx_ai_docs_cat ON ai_knowledge_documents(category);
    `);

    try {
      const docCount = db.prepare('SELECT count(*) as count FROM ai_knowledge_documents').get() as { count: number };
      if (!docCount || docCount.count === 0) {
        const seedDoc = db.prepare(`
          INSERT INTO ai_knowledge_documents (id, category, title, content, tags_json, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `);

        seedDoc.run(
          'doc_chaunsa',
          'VARIETIES',
          'Multani White Chaunsa & Kala Chaunsa Cultivars',
          'Multani White Chaunsa is the undisputed King of Mangoes. It boasts a world-class sweetness rating of 24° to 26° Brix with an intense honey-nectar fragrance, melting fiberless golden pulp, and thin skin. Harvested from early June through late August in our Multan and Shujabad groves. Kala Chaunsa (Black Chaunsa) ripens late August into September, featuring deep caramel-sweet richness and a dark green-gold blush.',
          JSON.stringify(['chaunsa', 'sweetness', 'brix', 'multan', 'flavor', 'king of mangoes'])
        );

        seedDoc.run(
          'doc_sindhri',
          'VARIETIES',
          'Sindhri — Queen of Mangoes from Mirpur Khas',
          'Sindhri is hailed as the Queen of Mangoes, native to our heritage groves in Mirpur Khas, Sindh. It offers a majestic elongated oval shape, bright lemon-yellow skin, and a luscious, aromatic sweetness rating of 21° to 22.5° Brix. Sindhri has virtually zero fiber, making it the premier choice for luxury mango milkshakes, desserts, and fresh table slicing. Harvested mid-May to mid-July.',
          JSON.stringify(['sindhri', 'queen of mangoes', 'mirpur khas', 'fiberless', 'sweet'])
        );

        seedDoc.run(
          'doc_anwar_ratol',
          'VARIETIES',
          'Anwar Ratol — The Miniature Perfume Cultivar',
          'Anwar Ratol is the most aromatic mango variety in South Asia. Small in stature but extraordinarily potent, with an astronomical sweetness rating of 26° to 27.5° Brix and an aroma score of 10/10. One opened crate fills an entire room with tropical perfume. Harvested in limited quantities between late June and mid-July.',
          JSON.stringify(['anwar ratol', 'aroma', 'perfume', 'sweetest', 'brix', 'delicacy'])
        );

        seedDoc.run(
          'doc_terroir',
          'ORCHARD_TERROIR',
          'Indus Canal Silt Terroir & Dawn Harvesting',
          'Al Usmani Orchards spans generational estates in Multan (Punjab) and Mirpur Khas (Sindh). Our trees are nourished by canal-fed Indus silt silt loam soils rich in potassium and minerals. We practice integrated orchard management with zero synthetic ripening chemicals. Every single mango is hand-plucked at dawn with its stem intact to preserve natural moisture and prevent sap burn.',
          JSON.stringify(['orchard', 'terroir', 'soil', 'multan', 'mirpur khas', 'farming', 'dawn picking'])
        );

        seedDoc.run(
          'doc_carbide_free',
          'STORAGE_RIPENING',
          '100% Calcium Carbide-Free Guarantee & Storage Guide',
          'Al Usmani Orchards guarantees 100% calcium carbide-free fruit. We never use banned ripening chemicals. Our mangoes ripen naturally on the branch or in temperature-controlled chambers. Storage Instructions: Keep mangoes in their cushioned packaging at room temperature until fragrant and yielding slightly to a gentle touch. Slice and chill 1-2 hours before serving. Do not store unripened fruit in the refrigerator.',
          JSON.stringify(['carbide free', 'natural ripening', 'storage', 'refrigerate', 'ripening guide'])
        );

        seedDoc.run(
          'doc_delivery',
          'SHIPPING',
          'Nationwide Cold-Chain Delivery, Rates & Packaging',
          'We deliver nationwide across all major cities of Pakistan including Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Sialkot, and Gujranwala. Delivery Timeline: 24 hours within Punjab; 36 to 48 hours for Sindh, KPK, and Balochistan. Shipping fee is Rs. 350 standard, Rs. 600 express. FREE SHIPPING is automatically applied on all orders over Rs. 10,000. Packed in export-grade double-wall corrugated cartons with ventilated foam sleeves.',
          JSON.stringify(['delivery', 'shipping', 'cities', 'free shipping', 'packaging', 'timeline', 'lahore', 'karachi', 'islamabad'])
        );

        seedDoc.run(
          'doc_guarantee',
          'POLICIES',
          '100% Honey-Sweet Satisfaction Guarantee & Damage Policy',
          'Every crate from Al Usmani Orchards is backed by our 100% Honey-Sweet Guarantee. If any mango arrives damaged, bruised in transit, or fails to meet our export standards, simply send a photo or video to our WhatsApp concierge (+92 300 8472910) within 24 hours of delivery. We will immediately arrange a complimentary replacement crate or full refund without hesitation.',
          JSON.stringify(['guarantee', 'refund', 'replacement', 'damaged', 'policy', 'quality'])
        );

        seedDoc.run(
          'doc_offers',
          'PRICING_DEALS',
          'Volume Crate Discounts & Seasonal Offers',
          'Al Usmani Orchards offers tiered volume savings for gifting and families: 5 to 9 crates: 5% automatic discount; 10 to 19 crates: 10% automatic discount; 20+ crates: 15% wholesale tier discount. Promo codes such as ROYAL10 and FIRSTHARVEST can be entered at checkout for special seasonal perks. Free shipping on orders over Rs. 10,000.',
          JSON.stringify(['offers', 'discount', 'coupons', 'volume savings', 'pricing', 'corporate'])
        );

        seedDoc.run(
          'doc_payment_faq',
          'FAQ',
          'Payment Methods, Pre-Orders & Corporate Gifting',
          'We accept Cash on Delivery (COD), EasyPaisa Mobile Account, JazzCash, and Visa/MasterCard. Pre-orders are available for upcoming harvest flushes with early-bird pricing. For corporate bulk gifting, we provide luxury gold-embossed wooden gift boxes with personalized calligraphy greeting cards and nationwide distribution lists.',
          JSON.stringify(['payment', 'cod', 'easypaisa', 'jazzcash', 'card', 'corporate gifting', 'pre-order'])
        );
      }
    } catch (aiDocErr) {
      console.warn('Error seeding ai_knowledge_documents:', aiDocErr);
    }

    // 38. Ensure Master Feature Control & Upgrade Tables
    db.exec(`
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

      CREATE TABLE IF NOT EXISTS wishlists (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        package_size_id TEXT REFERENCES package_sizes(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(customer_id, product_id, package_size_id)
      );

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

      CREATE INDEX IF NOT EXISTS idx_wishlists_cust ON wishlists(customer_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlists_cust_prod ON wishlists(customer_id, product_id);
      CREATE INDEX IF NOT EXISTS idx_back_in_stock_prod ON back_in_stock_subscriptions(product_id);
      CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_cust ON loyalty_ledger(customer_id);
      CREATE INDEX IF NOT EXISTS idx_abandoned_carts_token ON abandoned_carts(recovery_token);
    `);

    // Customer reviews migrations
    const revCols = db.prepare(`PRAGMA table_info(customer_reviews)`).all() as Array<{ name: string }>;
    const revSet = new Set(revCols.map(c => c.name));
    if (!revSet.has('status')) {
      db.exec(`ALTER TABLE customer_reviews ADD COLUMN status TEXT NOT NULL DEFAULT 'APPROVED';`);
    }
    if (!revSet.has('photos_json')) {
      db.exec(`ALTER TABLE customer_reviews ADD COLUMN photos_json TEXT DEFAULT '[]';`);
    }
    if (!revSet.has('helpful_count')) {
      db.exec(`ALTER TABLE customer_reviews ADD COLUMN helpful_count INTEGER DEFAULT 0;`);
    }

    // Default delivery zone
    const zoneCount = db.prepare('SELECT count(*) as count FROM delivery_zones').get() as { count: number };
    if (!zoneCount || zoneCount.count === 0) {
      db.prepare(`
        INSERT INTO delivery_zones (id, name, cities_json, delivery_fee, free_delivery_threshold, is_active, is_international, country_code)
        VALUES ('zone_pk_nationwide', 'Pakistan Nationwide Cold-Chain', ?, 350, 10000, 1, 0, 'PK')
      `).run(JSON.stringify(['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala']));
    }

    // Default production protection and security settings
    const prodProtect = db.prepare("SELECT value_json FROM store_settings WHERE key = 'production_protection'").get() as any;
    if (!prodProtect) {
      db.prepare("INSERT INTO store_settings (id, key, value_json) VALUES (?, 'production_protection', ?)").run(
        'set_prod_protection',
        JSON.stringify({
          enabled: true,
          maintenance_mode: false,
          retention_days_notifications: 90,
          retention_days_sessions: 30,
          retention_days_audit_logs: 365
        })
      );
    }

    const secSettings = db.prepare("SELECT value_json FROM store_settings WHERE key = 'security_settings'").get() as any;
    if (!secSettings) {
      db.prepare("INSERT INTO store_settings (id, key, value_json) VALUES (?, 'security_settings', ?)").run(
        'set_sec_settings',
        JSON.stringify({
          admin_otp_enabled: true,
          otp_provider: 'WHATSAPP',
          verified_security_phone: '+923008472910',
          otp_expiry_minutes: 5,
          otp_max_attempts: 5,
          otp_resend_cooldown_seconds: 60,
          step_up_mfa_required: true
        })
      );
    }

    // Initialize admin security phone
    try {
      db.prepare(`
        UPDATE users 
        SET security_phone = COALESCE(security_phone, phone, '+923008472910'),
            security_phone_verified = 1
        WHERE role IN ('SUPER_ADMIN', 'ADMIN') AND (security_phone IS NULL OR security_phone = '')
      `).run();
    } catch {}

    // Tag initial seed demo orders
    try {
      db.prepare(`
        UPDATE orders 
        SET is_demo = 1 
        WHERE (order_number LIKE 'AUO-10%' OR guest_email LIKE '%@gmail.com' OR guest_email LIKE '%@khi.pk' OR guest_email LIKE '%@isb-law.com' OR guest_email LIKE '%@textilegroup.pk')
          AND is_demo = 0
      `).run();

      db.prepare(`
        UPDATE customers 
        SET is_demo = 1 
        WHERE (email LIKE '%@test.pk' OR email LIKE '%@gmail.com' OR email LIKE '%@khi.pk' OR email LIKE '%@isb-law.com')
          AND is_demo = 0
      `).run();
    } catch {}

    // Seed pakistan_locations if empty
    try {
      const locTableCheck = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='pakistan_locations'").get() as { count: number };
      if (locTableCheck && locTableCheck.count > 0) {
        const rows = db.prepare("SELECT count(*) as count FROM pakistan_locations").get() as { count: number };
        if (!rows || rows.count < 20) {
          const { seedPakistanLocations } = require('../services/locations.service');
          seedPakistanLocations();
        }
      }
    } catch (e) {
      console.warn('Locations runtime seed note:', e);
    }
  } catch (err) {
    console.error('Runtime schema migration error:', err);
  }
}

export function ensureDatabaseReady() {
  if (global.__auo_db_ready) return;

  try {
    const db = getDatabase();
    // Fast check: Does users table exist and contain records?
    const tableCheck = db.prepare(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='users'"
    ).get() as { count: number };

    if (tableCheck && tableCheck.count > 0) {
      const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
      if (userCount && userCount.count > 0) {
        // Schema is already provisioned; apply runtime column/index migrations once
        applyRuntimeMigrations();
        global.__auo_db_ready = true;
        return;
      }
    }

    // Fresh initialization required
    console.log('[DATABASE] Initializing fresh database schema and seed data...');
    initializeDatabaseSchema();
    applyRuntimeMigrations();
    seedDatabase(false);
    global.__auo_db_ready = true;
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}
