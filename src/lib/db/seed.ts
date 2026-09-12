// @ts-nocheck
import { getDatabase, runTransaction } from './index';
import { initializeDatabaseSchema } from './schema';
import { hashPassword } from '../auth/crypto';
import crypto from 'node:crypto';

export function seedDatabase(force = false) {
  initializeDatabaseSchema();
  const db = getDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0 && !force) {
    // Run idempotent update of variety images, products, couriers, and store settings
    applySeedUpdates(db);
    return;
  }

  console.log('Seeding Al Usmani Orchards database...');

  runTransaction((db) => {
    // Clean old data if forced
    if (force) {
      db.exec(`
        DELETE FROM order_items;
        DELETE FROM order_timeline;
        DELETE FROM payments;
        DELETE FROM shipments;
        DELETE FROM shipment_tracking_events;
        DELETE FROM accounts_receivable;
        DELETE FROM orders;
        DELETE FROM customer_addresses;
        DELETE FROM customers;
        DELETE FROM inventory_transactions;
        DELETE FROM inventory;
        DELETE FROM preorder_campaigns;
        DELETE FROM tiered_discount_rules;
        DELETE FROM promotions;
        DELETE FROM package_sizes;
        DELETE FROM products;
        DELETE FROM harvest_batches;
        DELETE FROM farm_blocks;
        DELETE FROM farm_orchards;
        DELETE FROM mango_varieties;
        DELETE FROM couriers;
        DELETE FROM expense_categories;
        DELETE FROM expenses;
        DELETE FROM website_content;
        DELETE FROM customer_reviews;
        DELETE FROM store_settings;
        DELETE FROM users;
      `);
    }

    // 1. ADMIN & STAFF USERS
    const defaultPasswordHash = hashPassword('AlUsmaniRoyal2026!');
    const legacyPasswordHash = hashPassword('ShahiRoyal2026!');

    const adminUsers = [
      {
        id: crypto.randomUUID(),
        name: 'Mian Tariq Usmani',
        email: 'admin@alusmaniorchards.pk',
        role: 'SUPER_ADMIN',
        phone: '+92 300 8472910',
        pwdHash: defaultPasswordHash
      },
      {
        id: crypto.randomUUID(),
        name: 'Mian Tariq Shafi (Legacy)',
        email: 'admin@shahiorchards.pk',
        role: 'SUPER_ADMIN',
        phone: '+92 300 8472910',
        pwdHash: legacyPasswordHash
      },
      {
        id: crypto.randomUUID(),
        name: 'Ayesha Raza, CA',
        email: 'finance@alusmaniorchards.pk',
        role: 'FINANCE_MANAGER',
        phone: '+92 321 4455667',
        pwdHash: defaultPasswordHash
      },
      {
        id: crypto.randomUUID(),
        name: 'Malik Jahangir Khan',
        email: 'inventory@alusmaniorchards.pk',
        role: 'INVENTORY_MANAGER',
        phone: '+92 333 9988776',
        pwdHash: defaultPasswordHash
      },
      {
        id: crypto.randomUUID(),
        name: 'Hamza Farooq',
        email: 'support@alusmaniorchards.pk',
        role: 'SUPPORT_AGENT',
        phone: '+92 301 5566778',
        pwdHash: defaultPasswordHash
      }
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, phone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now'))
    `);

    for (const u of adminUsers) {
      insertUser.run(u.id, u.name, u.email, u.pwdHash, u.role, u.phone);
    }

    // 2. FARM ORCHARDS & BLOCKS
    const orchard1Id = crypto.randomUUID();
    const orchard2Id = crypto.randomUUID();
    const orchard3Id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO farm_orchards (id, name, location, total_acres, manager_name, contact_phone, soil_type, irrigation_source)
      VALUES 
        (?, 'Multan Royal Estate', 'Shujabad Road, Multan, Punjab', 55.0, 'Ustad Bashir Multani', '+92 300 7300112', 'Canal Alluvium & Heavy Silt', 'Chenab River Canal + Tube Wells'),
        (?, 'Mirpur Khas Heritage Grove', 'Mirwah Gorchani, Mirpur Khas, Sindh', 40.0, 'Wadera Aslam Jamali', '+92 333 2211990', 'Sandy Loam & Sweet Groundwater', 'Nara Canal System'),
        (?, 'Rahim Yar Khan Southern Orchard', 'Sadiqabad Oasis, RYK, Punjab', 35.0, 'Chaudhry Zahid Iqbal', '+92 312 9088123', 'Deep Organic Clay Loam', 'Indus River Fed Inundation Canal')
    `).run(orchard1Id, orchard2Id, orchard3Id);

    // 3. MANGO VARIETIES (Verified Authentic Images, 1:1 Mapping)
    const varieties = [
      {
        id: 'var-chaunsa',
        name: 'Chaunsa',
        slug: 'chaunsa-multani',
        origin_city: 'Multan',
        harvest_start_month: 6,
        harvest_end_month: 8,
        sweetness_brix: 24.5,
        aroma_level: 10,
        fiber_level: 2,
        acidity_level: 2,
        description: 'Renowned worldwide as the King of Mangoes. Grown in the sun-drenched, canal-fed silt of Multan, our Chaunsa yields a velvety nectar of intense floral sweetness with a buttery, virtually fiber-free texture.',
        flavor_notes: 'Honeyed nectar, wild jasmine blossom, warm caramel undertone',
        image_url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=80',
        sort_order: 1
      },
      {
        id: 'var-sindhri',
        name: 'Sindhri',
        slug: 'sindhri-mirpur-khas',
        origin_city: 'Mirpur Khas',
        harvest_start_month: 5,
        harvest_end_month: 7,
        sweetness_brix: 21.0,
        aroma_level: 9,
        fiber_level: 1,
        acidity_level: 3,
        description: 'The celebrated Queen of Mangoes from Sindh. Instantly recognizable by its regal elongated shape and luminous golden skin, offering a delicate aromatic sweetness with a refreshing citrus hint.',
        flavor_notes: 'Subtle mandarin blossom, creamy custard, gentle tropical acidity',
        image_url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=1000&q=80',
        sort_order: 2
      },
      {
        id: 'var-anwar-ratol',
        name: 'Anwar Ratol',
        slug: 'anwar-ratol-heritage',
        origin_city: 'Rahim Yar Khan',
        harvest_start_month: 6,
        harvest_end_month: 7,
        sweetness_brix: 26.0,
        aroma_level: 10,
        fiber_level: 3,
        acidity_level: 1,
        description: 'The miniature perfumed jewel. Compact in size but boasting the highest concentration of sugar and volatile aromatic esters of any mango on earth. A single box will perfume an entire household.',
        flavor_notes: 'Intense clover honey, cardamom spice, rosewater perfume',
        image_url: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=1000&q=80',
        sort_order: 3
      },
      {
        id: 'var-dussehri',
        name: 'Dussehri',
        slug: 'dussehri-royal-mughal',
        origin_city: 'Punjab Orchards',
        harvest_start_month: 5,
        harvest_end_month: 6,
        sweetness_brix: 22.5,
        aroma_level: 8,
        fiber_level: 2,
        acidity_level: 2,
        description: 'An ancient Mughal heirloom cultivated in our heritage royal groves. Medium-sized with smooth, tender melting pulp and an exquisite sweet bouquet beloved by connoisseurs for centuries.',
        flavor_notes: 'Brown sugar candy, apricot, gentle musk',
        // Authentic mango image (Oblong ripe mangoes)
        image_url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=1000&q=80',
        sort_order: 4
      },
      {
        id: 'var-white-chaunsa',
        name: 'White Chaunsa',
        slug: 'white-chaunsa-late-harvest',
        origin_city: 'Multan',
        harvest_start_month: 8,
        harvest_end_month: 9,
        sweetness_brix: 25.0,
        aroma_level: 9,
        fiber_level: 1,
        acidity_level: 2,
        description: 'The prestigious late-season crowning gem of Pakistan. Preserving its firm pale golden flesh well into September, it delivers majestic sweetness and unrivaled export longevity.',
        flavor_notes: 'Vanilla blossom, concentrated honey, pear nectar',
        // Authentic sliced golden-amber mango image
        image_url: 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1000&q=80',
        sort_order: 5
      }
    ];

    const insertVariety = db.prepare(`
      INSERT INTO mango_varieties (
        id, name, slug, origin_city, harvest_start_month, harvest_end_month,
        sweetness_brix, aroma_level, fiber_level, acidity_level, description,
        flavor_notes, image_url, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    for (const v of varieties) {
      insertVariety.run(
        v.id, v.name, v.slug, v.origin_city, v.harvest_start_month, v.harvest_end_month,
        v.sweetness_brix, v.aroma_level, v.fiber_level, v.acidity_level, v.description,
        v.flavor_notes, v.image_url, v.sort_order
      );
    }

    // 4. FARM BLOCKS
    const block1Id = crypto.randomUUID();
    const block2Id = crypto.randomUUID();
    const block3Id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO farm_blocks (id, orchard_id, block_code, variety_id, tree_count, planting_year, soil_status)
      VALUES 
        (?, ?, 'BLK-M1-CHAUNSA', 'var-chaunsa', 420, 1994, 'Rich Silt Loam - pH 7.8'),
        (?, ?, 'BLK-S1-SINDHRI', 'var-sindhri', 380, 2002, 'Alluvial Sweet Soil'),
        (?, ?, 'BLK-R1-RATOL', 'var-anwar-ratol', 290, 1998, 'Canal Deposit Loam')
    `).run(block1Id, orchard1Id, block2Id, orchard2Id, block3Id, orchard3Id);

    // 5. PRODUCTS (All 5 varieties)
    const products = [
      {
        id: 'prod-chaunsa',
        variety_id: 'var-chaunsa',
        name: 'Royal Multani Chaunsa (Export Grade A+)',
        slug: 'royal-multani-chaunsa',
        tagline: 'The undisputed King of Mangoes — pure tree-ripened honeyed ecstasy',
        description: 'Hand-plucked at the break of dawn from century-old grafted trees in Multan. Each mango undergoes rigorous brix density inspection and is cushioned in our custom-aerated gold luxury box. Zero calcium carbide, 100% organic ripening.',
        grade: 'Export Grade A+ (Brix 24°+)',
        harvest_season: 'Mid July – Late August 2026',
        ripeness_guide: 'Ready to eat within 24–48 hours upon arrival. Skin turns a glowing warm golden saffron.',
        is_featured: 1,
        is_preorder_active: 0,
        primary_image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=80',
        seo_title: 'Buy Royal Multani Chaunsa Mangoes Online | Al Usmani Orchards',
        seo_description: 'Order authentic hand-picked Multani Chaunsa mangoes directly from Al Usmani Orchards. Nationwide 24h cold-chain delivery with zero chemicals.'
      },
      {
        id: 'prod-sindhri',
        variety_id: 'var-sindhri',
        name: 'Imperial Mirpur Khas Sindhri',
        slug: 'imperial-mirpur-khas-sindhri',
        tagline: 'The Queen of Mangoes — velvety, aromatic, and delicate',
        description: 'Cultivated in Mirpur Khas using traditional sweet-water canal irrigation. Perfectly symmetrical, large golden mangoes known for their smooth skin and tender, melt-in-the-mouth texture.',
        grade: 'Export Grade A+ (Brix 21°+)',
        harvest_season: 'Late May – Early July 2026',
        ripeness_guide: 'Best consumed chilled. Gently yields to thumb pressure when ripe.',
        is_featured: 1,
        is_preorder_active: 0,
        primary_image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=1000&q=80',
        seo_title: 'Imperial Sindhri Mangoes | Buy Mirpur Khas Mangoes Online',
        seo_description: 'Fresh farm-to-table Sindhri mangoes from Al Usmani Orchards. Naturally ripened, export quality, guaranteed sweetness.'
      },
      {
        id: 'prod-anwar-ratol',
        variety_id: 'var-anwar-ratol',
        name: 'Heritage Anwar Ratol Perfumed Reserve',
        slug: 'heritage-anwar-ratol',
        tagline: 'Miniature jewels with an intoxicating, room-filling fragrance',
        description: 'Rare and sought after by discerning connoisseurs worldwide. Small in stature but bursting with unparalleled aromatic richness and sugar density.',
        grade: 'Reserve Connoisseur Grade',
        harvest_season: 'June – July 2026',
        ripeness_guide: 'Skin turns luminous canary yellow. Consume within 3 days of peak scent.',
        is_featured: 1,
        is_preorder_active: 0,
        primary_image: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=1000&q=80',
        seo_title: 'Authentic Anwar Ratol Mangoes | Al Usmani Orchards',
        seo_description: 'Taste the legendary fragrance of pure Rahim Yar Khan Anwar Ratol mangoes delivered fresh to your door from Al Usmani Orchards.'
      },
      {
        id: 'prod-dussehri',
        variety_id: 'var-dussehri',
        name: 'Royal Heritage Dussehri',
        slug: 'royal-heritage-dussehri',
        tagline: 'Ancient Mughal heirloom — sweet, melting pulp with floral aroma',
        description: 'Cultivated in our century-old heritage royal groves. Oblong in shape with smooth tender melting pulp and an exquisite sweet bouquet beloved by connoisseurs for centuries.',
        grade: 'Export Grade A+ (Brix 22.5°+)',
        harvest_season: 'Late May – June 2026',
        ripeness_guide: 'Ready when skin shows gentle saffron hues and gives softly to gentle touch.',
        is_featured: 1,
        is_preorder_active: 0,
        primary_image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=1000&q=80',
        seo_title: 'Buy Royal Heritage Dussehri Mangoes Online | Al Usmani Orchards',
        seo_description: 'Order authentic hand-picked Dussehri mangoes directly from Al Usmani Orchards. Nationwide 24h delivery with zero chemicals.'
      },
      {
        id: 'prod-white-chaunsa',
        variety_id: 'var-white-chaunsa',
        name: 'Crown Reserve White Chaunsa (Late Harvest)',
        slug: 'crown-white-chaunsa',
        tagline: 'The elusive late-season royal delicacy — pre-order for September flush',
        description: 'The final and grandest harvest of the year. White Chaunsa stays on the tree weeks after other varieties have concluded, concentrating exquisite vanilla and honey sugars.',
        grade: 'Export Grade A+ Platinum',
        harvest_season: 'Late August – September 2026',
        ripeness_guide: 'Pale amber-white skin with firm, buttery pulp.',
        is_featured: 1,
        is_preorder_active: 1,
        primary_image: 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1000&q=80',
        seo_title: 'Pre-Order White Chaunsa Mangoes | Al Usmani Orchards Reserve',
        seo_description: 'Reserve late-season White Chaunsa mangoes online. Limited harvest crates dispatched fresh in September from Al Usmani Orchards.'
      }
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (
        id, variety_id, name, slug, tagline, description, grade, harvest_season,
        ripeness_guide, is_featured, is_preorder_active, status, primary_image,
        seo_title, seo_description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, datetime('now'), datetime('now'))
    `);

    for (const p of products) {
      insertProd.run(
        p.id, p.variety_id, p.name, p.slug, p.tagline, p.description, p.grade,
        p.harvest_season, p.ripeness_guide, p.is_featured, p.is_preorder_active,
        p.primary_image, p.seo_title, p.seo_description
      );
    }

    // 6. DYNAMIC PACKAGE SIZES & INVENTORY
    const packageConfigs = [
      // Chaunsa Packages
      { id: 'pkg-ch-5', prodId: 'prod-chaunsa', name: '5 KG Royal Gift Box', weight: 5.0, base: 2800, sale: 2500, pre: 2200, sku: 'CH-BOX-5KG', stock: 85 },
      { id: 'pkg-ch-8', prodId: 'prod-chaunsa', name: '8 KG Family Crate', weight: 8.0, base: 4200, sale: 3700, pre: 3300, sku: 'CH-BOX-8KG', stock: 60 },
      { id: 'pkg-ch-10', prodId: 'prod-chaunsa', name: '10 KG Connoisseur Feast', weight: 10.0, base: 5200, sale: 4500, pre: 4000, sku: 'CH-BOX-10KG', stock: 45 },
      
      // Sindhri Packages
      { id: 'pkg-si-5', prodId: 'prod-sindhri', name: '5 KG Royal Gift Box', weight: 5.0, base: 2600, sale: 2300, pre: 2100, sku: 'SI-BOX-5KG', stock: 70 },
      { id: 'pkg-si-8', prodId: 'prod-sindhri', name: '8 KG Family Crate', weight: 8.0, base: 3900, sale: 3500, pre: 3100, sku: 'SI-BOX-8KG', stock: 50 },
      { id: 'pkg-si-10', prodId: 'prod-sindhri', name: '10 KG Connoisseur Feast', weight: 10.0, base: 4800, sale: 4300, pre: 3800, sku: 'SI-BOX-10KG', stock: 40 },

      // Anwar Ratol Packages
      { id: 'pkg-ar-5', prodId: 'prod-anwar-ratol', name: '5 KG Luxury Carton', weight: 5.0, base: 3500, sale: 3100, pre: 2800, sku: 'AR-BOX-5KG', stock: 40 },
      { id: 'pkg-ar-8', prodId: 'prod-anwar-ratol', name: '8 KG Heritage Crate', weight: 8.0, base: 5300, sale: 4700, pre: 4200, sku: 'AR-BOX-8KG', stock: 25 },

      // Dussehri Packages
      { id: 'pkg-du-5', prodId: 'prod-dussehri', name: '5 KG Royal Gift Box', weight: 5.0, base: 2700, sale: 2400, pre: 2150, sku: 'DU-BOX-5KG', stock: 55 },
      { id: 'pkg-du-8', prodId: 'prod-dussehri', name: '8 KG Family Crate', weight: 8.0, base: 4000, sale: 3600, pre: 3200, sku: 'DU-BOX-8KG', stock: 40 },
      { id: 'pkg-du-10', prodId: 'prod-dussehri', name: '10 KG Connoisseur Feast', weight: 10.0, base: 5000, sale: 4400, pre: 3900, sku: 'DU-BOX-10KG', stock: 30 },

      // White Chaunsa Pre-Order Packages
      { id: 'pkg-wc-5', prodId: 'prod-white-chaunsa', name: '5 KG Export Box', weight: 5.0, base: 3200, sale: 2900, pre: 2600, sku: 'WC-BOX-5KG', stock: 100 },
      { id: 'pkg-wc-10', prodId: 'prod-white-chaunsa', name: '10 KG Master Crate', weight: 10.0, base: 5900, sale: 5400, pre: 4800, sku: 'WC-BOX-10KG', stock: 80 }
    ];

    const insertPkg = db.prepare(`
      INSERT INTO package_sizes (
        id, product_id, name, weight_kg, base_price, sale_price, preorder_price,
        wholesale_price, sku, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
    `);

    const insertInv = db.prepare(`
      INSERT INTO inventory (
        id, package_size_id, total_stock, available_stock, reserved_stock,
        sold_stock, damaged_stock, low_stock_threshold, updated_at
      ) VALUES (?, ?, ?, ?, 0, 0, 0, 10, datetime('now'))
    `);

    const insertInvTx = db.prepare(`
      INSERT INTO inventory_transactions (
        id, package_size_id, transaction_type, quantity, balance_after,
        reason, created_by, created_at
      ) VALUES (?, ?, 'INITIAL_LOAD', ?, ?, 'Initial season 2026 orchard harvest load', 'system', datetime('now'))
    `);

    for (const pkg of packageConfigs) {
      insertPkg.run(
        pkg.id, pkg.prodId, pkg.name, pkg.weight, pkg.base, pkg.sale, pkg.pre,
        Math.round(pkg.sale * 0.85), pkg.sku
      );

      const invId = crypto.randomUUID();
      insertInv.run(invId, pkg.id, pkg.stock, pkg.stock);

      const txId = crypto.randomUUID();
      insertInvTx.run(txId, pkg.id, pkg.stock, pkg.stock);
    }

    // 7. HARVEST BATCHES
    db.prepare(`
      INSERT INTO harvest_batches (
        id, batch_code, variety_id, orchard_id, block_id, harvest_date,
        expected_dispatch_date, total_yield_kg, available_kg, reserved_kg,
        sold_kg, wastage_kg, status, notes
      ) VALUES 
        ('batch-ch-01', 'CH-2026-01', 'var-chaunsa', ?, ?, '2026-09-08', '2026-09-10', 2500.0, 1500.0, 400.0, 550.0, 50.0, 'HARVESTED', 'Peak sugar brix 24.5. Dawn hand-picked with 1cm stem retained.'),
        ('batch-si-01', 'SI-2026-01', 'var-sindhri', ?, ?, '2026-09-07', '2026-09-09', 3000.0, 1800.0, 350.0, 800.0, 50.0, 'HARVESTED', 'Export Grade A+ warm-water washed and air dried.'),
        ('batch-ar-01', 'AR-2026-01', 'var-anwar-ratol', ?, ?, '2026-09-06', '2026-09-08', 1200.0, 700.0, 150.0, 320.0, 30.0, 'PACKED', 'Perfume concentration 10/10.')
    `).run(orchard1Id, block1Id, orchard2Id, block2Id, orchard3Id, block3Id);

    // 8. PRE-ORDER CAMPAIGNS
    db.prepare(`
      INSERT INTO preorder_campaigns (
        id, title, slug, product_id, package_size_id, regular_price,
        preorder_price, deposit_amount, min_qty, max_qty, total_capacity,
        reserved_count, start_date, end_date, expected_harvest_date,
        expected_dispatch_date, estimated_delivery_date, status, customer_terms, banner_image
      ) VALUES 
        ('camp-wc-2026', 'Late-Flush Crown White Chaunsa Reserve 2026', 'white-chaunsa-reserve-2026', 'prod-white-chaunsa', 'pkg-wc-10', 5900, 4800, 1000, 1, 10, 500, 342, '2026-05-01', '2026-08-25', '2026-08-28', '2026-09-02', '2026-09-05', 'ACTIVE', 'Early bird guaranteed allocation. Dispatched via temperature-controlled reefer cargo.', 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1200&q=80')
    `).run();

    // 9. PROMOTIONS & TIERED VOLUME DISCOUNTS
    const tieredPromoId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO promotions (
        id, name, code, discount_type, discount_value, min_order_value,
        starts_at, expires_at, is_stackable, customer_segment, is_active
      ) VALUES 
        (?, 'Harvest Season Volume Savings', NULL, 'TIERED', 0, 0, '2026-05-01', '2026-10-31', 1, 'ALL', 1),
        ('promo-royal10', 'Royal Harvest Special', 'ROYAL10', 'PERCENTAGE', 10, 5000, '2026-05-01', '2026-10-31', 1, 'ALL', 1),
        ('promo-mango500', 'Flat PKR 500 Off Crate Feast', 'MANGO500', 'FIXED', 500, 7000, '2026-05-01', '2026-10-31', 0, 'ALL', 1),
        ('promo-vip15', 'VIP Patron Exclusive', 'VIPMEMBER', 'PERCENTAGE', 15, 8000, '2026-05-01', '2026-10-31', 1, 'VIP', 1)
    `).run(tieredPromoId);

    db.prepare(`
      INSERT INTO tiered_discount_rules (id, promotion_id, min_units, max_units, discount_percentage)
      VALUES 
        (?, ?, 5, 9, 5),
        (?, ?, 10, 19, 10),
        (?, ?, 20, NULL, 15)
    `).run(
      crypto.randomUUID(), tieredPromoId,
      crypto.randomUUID(), tieredPromoId,
      crypto.randomUUID(), tieredPromoId
    );

    // 10. COURIERS (With Verified SVG Logos & Tracking Templates)
    db.prepare(`
      INSERT INTO couriers (id, name, code, tracking_url_template, logo_url, cod_supported, is_active)
      VALUES 
        ('cour-tcs', 'TCS Express Cold-Chain', 'TCS', 'https://www.tcsexpress.com/tracking?tracking_number={TRACKING_NO}', '/images/couriers/tcs.svg', 1, 1),
        ('cour-leo', 'Leopards Courier Overland', 'LEO', 'https://www.leopardscourier.com/tracking?track_no={TRACKING_NO}', '/images/couriers/leopards.svg', 1, 1),
        ('cour-mnp', 'M&P Express Logistics', 'MNP', 'https://mulphilog.com/tracking?consignment_no={TRACKING_NO}', '/images/couriers/mp.svg', 1, 1),
        ('cour-pakpost', 'Pakistan Post UMS Urgent Mail', 'PAKPOST', 'https://ep.gov.pk/track?track_id={TRACKING_NO}', '/images/couriers/pakpost.svg', 1, 1)
    `).run();

    // 11. EXPENSE CATEGORIES & RECORDED EXPENSES
    const expenseCategories = [
      { id: 'exp-cat-proc', name: 'Mango Procurement & Production', desc: 'Direct farm labor, tree maintenance, brix testing' },
      { id: 'exp-cat-pack', name: 'Luxury Packaging & Boxes', desc: 'Corrugated aerated 5-ply export crates, foam nests' },
      { id: 'exp-cat-cour', name: 'Courier Freight & Cold-Chain', desc: 'TCS, Leopards air and overland reefer vans' },
      { id: 'exp-cat-mkt',  name: 'Digital Marketing & Content', desc: 'Cinematic photography, Meta ads, influencer gifting' },
      { id: 'exp-cat-labor',name: 'Harvest & Packing Labor', desc: 'Orchard picker wages, sorters, QC inspectors' },
      { id: 'exp-cat-util', name: 'Power, Fuel & Cold Storage', desc: 'Refrigeration solar power, generator diesel' },
      { id: 'exp-cat-maint',name: 'Orchard Tools & Equipment', desc: 'Pruning shears, ladders, canvas harvesting bags' },
      { id: 'exp-cat-tax',  name: 'Taxes & Gateway Processing', desc: 'Card processing fees, provincial levies' }
    ];

    const insertExpCat = db.prepare('INSERT INTO expense_categories (id, name, description) VALUES (?, ?, ?)');
    for (const c of expenseCategories) {
      insertExpCat.run(c.id, c.name, c.desc);
    }

    const expensesList = [
      { cat: 'exp-cat-proc', amount: 320000, desc: 'Seasonal canal water irrigation rights and bio-compost enrichment', vendor: 'Punjab Irrigation & Green Bio Fertilizers' },
      { cat: 'exp-cat-pack', amount: 145000, desc: 'Batch of 3,000 custom gold-embossed corrugated ventilated gift cartons', vendor: 'Packages Limited, Lahore' },
      { cat: 'exp-cat-pack', amount: 28000, desc: 'Protective food-grade foam sleeves and moisture absorption pads', vendor: 'Crown Packaging Supplies' },
      { cat: 'exp-cat-labor', amount: 180000, desc: 'Dawn-picking master harvester crew and grading staff (2 weeks)', vendor: 'Shujabad Harvesters Syndicate' },
      { cat: 'exp-cat-cour', amount: 125000, desc: 'Advance deposit for dedicated cold-chain reefer pickups', vendor: 'TCS Cold Chain Logistics' },
      { cat: 'exp-cat-mkt', amount: 95000, desc: 'Cinematic harvest launch campaign & Google/Meta ads', vendor: 'Verve Media Agency' },
      { cat: 'exp-cat-util', amount: 48000, desc: 'Solar battery backup & diesel generator for cold-store chiller', vendor: 'Multan Fuel Depot' },
      { cat: 'exp-cat-tax', amount: 16200, desc: 'Online payment gateway transaction fees', vendor: 'Bank Alfalah Gateway' }
    ];

    const insertExp = db.prepare(`
      INSERT INTO expenses (
        id, category_id, amount, expense_date, description, vendor_name,
        payment_method, reference_no, created_by, created_at
      ) VALUES (?, ?, ?, date('now', '-5 days'), ?, ?, 'BANK_TRANSFER', ?, 'admin@alusmaniorchards.pk', datetime('now'))
    `);

    for (const exp of expensesList) {
      insertExp.run(crypto.randomUUID(), exp.cat, exp.amount, exp.desc, exp.vendor, `REF-${Math.floor(10000 + Math.random() * 90000)}`);
    }

    // 12. CUSTOMERS & REALISTIC HISTORICAL ORDERS (AUO-10201 to AUO-10205)
    const customerSeed = [
      { name: 'Dr. Shahzad Tariq', email: 'shahzad.tariq@gmail.com', phone: '+92 300 4529182', city: 'Lahore', address: 'House 42, Block G, Phase 5, DHA, Lahore', seg: 'VIP' },
      { name: 'Fatima Al-Hassan', email: 'fatima.hassan@khi.pk', phone: '+92 321 8899221', city: 'Karachi', address: 'Apartment 8B, Ocean View Towers, Clifton Block 4, Karachi', seg: 'HIGH_VALUE' },
      { name: 'Senator (R) Mansoor Qureshi', email: 'm.qureshi@isb-law.com', phone: '+92 333 5152899', city: 'Islamabad', address: 'Street 14, Sector F-7/2, Islamabad', seg: 'VIP' },
      { name: 'Bilal Ahmad Butt', email: 'bilal.butt@textilegroup.pk', phone: '+92 301 7766554', city: 'Faisalabad', address: 'Canal Road Officers Colony, Faisalabad', seg: 'RETURNING' },
      { name: 'Mariam Zubair', email: 'mariam.z@outlook.com', phone: '+92 345 2233441', city: 'Rawalpindi', address: 'House 19, Chaklala Scheme 3, Rawalpindi', seg: 'NEW' }
    ];

    const insertCust = db.prepare(`
      INSERT INTO customers (id, full_name, email, phone, city, segment, total_spent, orders_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, datetime('now'))
    `);

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, order_number, customer_id, guest_email, guest_name, guest_phone,
        status, subtotal, discount_amount, shipping_fee, tax_amount, total_amount,
        payment_method, payment_status, coupon_code, shipping_address_json,
        is_gift, gift_recipient, gift_message, courier_id, tracking_number,
        internal_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now'))
    `);

    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (
        id, order_id, product_id, package_size_id, batch_id, variety_name,
        package_name, unit_weight_kg, unit_price, quantity, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTimeline = db.prepare(`
      INSERT INTO order_timeline (id, order_id, status, title, description, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', ?))
    `);

    const insertPayment = db.prepare(`
      INSERT INTO payments (id, order_id, amount, payment_method, transaction_reference, status, verified_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'System Auto-Verify', datetime('now', ?))
    `);

    const insertShipment = db.prepare(`
      INSERT INTO shipments (
        id, order_id, courier_id, tracking_number, shipment_status, shipping_cost,
        cod_amount, pickup_date, estimated_delivery_date, actual_delivery_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, date('now', '-2 days'), date('now', '+1 days'), ?, datetime('now', ?))
    `);

    const insertTrackingEvent = db.prepare(`
      INSERT INTO shipment_tracking_events (id, shipment_id, event_time, status, location, description)
      VALUES (?, ?, datetime('now', ?), ?, ?, ?)
    `);

    const ordersData = [
      {
        orderNum: 'AUO-10201',
        custIdx: 0,
        status: 'DELIVERED',
        payMethod: 'ONLINE_CARD',
        payStatus: 'PAID',
        pkgId: 'pkg-ch-10',
        prodId: 'prod-chaunsa',
        variety: 'Chaunsa',
        pkgName: '10 KG Connoisseur Feast',
        weight: 10,
        price: 4500,
        qty: 3,
        subtotal: 13500,
        discount: 1350,
        shipping: 500,
        total: 12650,
        courier: 'cour-tcs',
        trackNo: 'TCS-88392011',
        timeOffset: '-4 days',
        isGift: 1,
        giftRecipient: 'Begum Naseem Tariq',
        giftMsg: 'Warmest wishes on your birthday from Lahore family.'
      },
      {
        orderNum: 'AUO-10202',
        custIdx: 1,
        status: 'SHIPPED',
        payMethod: 'COD',
        payStatus: 'PENDING',
        pkgId: 'pkg-si-8',
        prodId: 'prod-sindhri',
        variety: 'Sindhri',
        pkgName: '8 KG Family Crate',
        weight: 8,
        price: 3500,
        qty: 2,
        subtotal: 7000,
        discount: 0,
        shipping: 500,
        total: 7500,
        courier: 'cour-leo',
        trackNo: 'LEO-44910283',
        timeOffset: '-2 days',
        isGift: 0
      },
      {
        orderNum: 'AUO-10203',
        custIdx: 2,
        status: 'READY_FOR_DISPATCH',
        payMethod: 'BANK_TRANSFER',
        payStatus: 'PAID',
        pkgId: 'pkg-ar-5',
        prodId: 'prod-anwar-ratol',
        variety: 'Anwar Ratol',
        pkgName: '5 KG Luxury Carton',
        weight: 5,
        price: 3100,
        qty: 4,
        subtotal: 12400,
        discount: 1240,
        shipping: 450,
        total: 11610,
        courier: 'cour-tcs',
        trackNo: 'TCS-90182374',
        timeOffset: '-1 days',
        isGift: 0
      },
      {
        orderNum: 'AUO-10204',
        custIdx: 3,
        status: 'PACKED',
        payMethod: 'COD',
        payStatus: 'PENDING',
        pkgId: 'pkg-ch-8',
        prodId: 'prod-chaunsa',
        variety: 'Chaunsa',
        pkgName: '8 KG Family Crate',
        weight: 8,
        price: 3700,
        qty: 1,
        subtotal: 3700,
        discount: 0,
        shipping: 350,
        total: 4050,
        courier: 'cour-mnp',
        trackNo: 'MNP-33019245',
        timeOffset: '-6 hours',
        isGift: 0
      },
      {
        orderNum: 'AUO-10205',
        custIdx: 4,
        status: 'CONFIRMED',
        payMethod: 'COD',
        payStatus: 'PENDING',
        pkgId: 'pkg-si-5',
        prodId: 'prod-sindhri',
        variety: 'Sindhri',
        pkgName: '5 KG Royal Gift Box',
        weight: 5,
        price: 2300,
        qty: 2,
        subtotal: 4600,
        discount: 0,
        shipping: 450,
        total: 5050,
        courier: null,
        trackNo: null,
        timeOffset: '-2 hours',
        isGift: 1,
        giftRecipient: 'Chaudhry Zubair & Family',
        giftMsg: 'Enjoy the sweetness of our first harvest.'
      }
    ];

    for (let i = 0; i < customerSeed.length; i++) {
      const c = customerSeed[i];
      const custId = `cust-${i + 1}`;
      insertCust.run(custId, c.name, c.email, c.phone, c.city, c.seg);
    }

    for (const od of ordersData) {
      const orderId = crypto.randomUUID();
      const cust = customerSeed[od.custIdx];
      const custId = `cust-${od.custIdx + 1}`;

      insertOrder.run(
        orderId, od.orderNum, custId, cust.email, cust.name, cust.phone,
        od.status, od.subtotal, od.discount, od.shipping, od.total,
        od.payMethod, od.payStatus, od.discount > 0 ? 'ROYAL10' : null,
        JSON.stringify({ name: cust.name, phone: cust.phone, address: cust.address, city: cust.city }),
        od.isGift, od.giftRecipient || null, od.giftMsg || null,
        od.courier, od.trackNo, 'High-priority premium harvest allocation',
        od.timeOffset
      );

      insertOrderItem.run(
        crypto.randomUUID(), orderId, od.prodId, od.pkgId, 'batch-ch-01',
        od.variety, od.pkgName, od.weight, od.price, od.qty, od.subtotal
      );

      insertTimeline.run(
        crypto.randomUUID(), orderId, 'CONFIRMED', 'Order Confirmed',
        `Allocation scheduled from harvest batch. Payment mode: ${od.payMethod}.`,
        od.timeOffset
      );

      if (od.payStatus === 'PAID') {
        insertPayment.run(
          crypto.randomUUID(), orderId, od.total, od.payMethod,
          `TXN-${Math.floor(100000 + Math.random() * 900000)}`, 'PAID', od.timeOffset
        );
      }

      if (od.courier && od.trackNo) {
        const shipId = crypto.randomUUID();
        insertShipment.run(
          shipId, orderId, od.courier, od.trackNo,
          od.status === 'DELIVERED' ? 'DELIVERED' : 'IN_TRANSIT',
          od.shipping,
          od.payMethod === 'COD' ? od.total : 0,
          od.status === 'DELIVERED' ? dateStr('-1 days') : null,
          od.timeOffset
        );

        insertTrackingEvent.run(
          crypto.randomUUID(), shipId, od.timeOffset, 'BOOKED',
          'Multan Orchard Cold-Hub', 'Crate packed into ventilated thermal cargo box'
        );
        insertTrackingEvent.run(
          crypto.randomUUID(), shipId, '-1 days', 'IN_TRANSIT',
          'National Transit Hub', 'Consignment loaded onto temperature-controlled vehicle'
        );

        if (od.status === 'DELIVERED') {
          insertTrackingEvent.run(
            crypto.randomUUID(), shipId, '-4 hours', 'DELIVERED',
            `${cust.city} Station`, 'Successfully handed over to consignee'
          );
        }
      }

      db.prepare(`
        UPDATE customers 
        SET total_spent = total_spent + ?, orders_count = orders_count + 1 
        WHERE id = ?
      `).run(od.total, custId);
    }

    // 13. WEBSITE CMS CONTENT (Al Usmani Orchards)
    db.prepare(`
      INSERT INTO website_content (id, section_key, content_json, updated_at)
      VALUES 
        ('cms-hero', 'hero', ?, datetime('now')),
        ('cms-story', 'farm_story', ?, datetime('now')),
        ('cms-announcement', 'announcement', ?, datetime('now')),
        ('cms-faqs', 'faqs', ?, datetime('now'))
    `).run(
      JSON.stringify({
        headline: 'From Our Orchards to Your Door.',
        subheadline: 'Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care. Handpicked at dawn along the fertile canal silt of Multan and Mirpur Khas.',
        primaryCta: 'SHOP THE HARVEST',
        secondaryCta: 'EXPLORE OUR FARM',
        brixBadge: 'Guaranteed 24°+ Brix Sweetness',
        dispatchNote: 'Dawn-Picked • 24h Cold-Chain Nationwide Dispatch'
      }),
      JSON.stringify({
        title: 'Four Generations of Al Usmani Orchards Mastery',
        narrative: 'Our heritage groves lie along the fertile silt of the ancient Chenab river in Multan and sweet-water canals of Mirpur Khas. Since 1934, our family has dedicated itself to natural tree-ripening, rejecting artificial calcium carbide chemicals. Every mango is picked at peak physiological brix sweetness, delivering pure floral nectar.',
        pillars: [
          { title: '100% Tree Ripened', desc: 'Never harvested premature; permitted to develop rich natural aromatic esters on the branch.' },
          { title: 'Zero Calcium Carbide', desc: 'Ripened using ambient temperature and natural orchard airflow without chemicals.' },
          { title: 'Export-Grade Nesting', desc: 'Packed in 5-ply corrugated ventilated cartons with food-grade protective sleeves.' }
        ]
      }),
      JSON.stringify({
        bannerText: '🥭 AL USMANI ORCHARDS • HARVEST SEASON 2026: BUY 10+ CRATES & SAVE 15% AUTOMATICALLY • 24H NATIONWIDE COLD-CHAIN DISPATCH',
        active: true
      }),
      JSON.stringify([
        { q: 'How do you guarantee that your mangoes are carbide-free?', a: 'Every crate is backed by our Zero Chemical Guarantee. We harvest only when fruit exhibits peak physiological maturity on the branch, allowing natural enzymes to convert starches into sugars without industrial calcium carbide.' },
        { q: 'How does shipping work to Karachi, Islamabad, or Lahore?', a: 'Mangoes are picked at dawn (5:00 AM) to preserve orchard coolness, washed in spring water, graded, cushioned in protective sleeves, and dispatched via dedicated temperature-monitored couriers within 24 hours.' },
        { q: 'Can I send a luxury gift box to family or corporate clients?', a: 'Yes! Our "Send as Gift" option lets you enter recipient details, a personalized gold-embossed message card, and premium satin ribbon wrapping at no additional cost.' },
        { q: 'What happens if fruit arrives bruised or damaged?', a: 'We offer an unconditional replacement guarantee. Simply share a photo of your crate via WhatsApp concierge within 12 hours of delivery for an instant replacement or refund.' }
      ])
    );

    // 14. CUSTOMER REVIEWS
    db.prepare(`
      INSERT INTO customer_reviews (id, product_id, customer_name, city, rating, comment, is_verified_purchase, is_approved)
      VALUES 
        (?, 'prod-chaunsa', 'Malik Jahandad', 'Islamabad', 5, 'The sweetness was beyond belief. Cut into the first mango and the entire living room was filled with honeyed aroma. True Multani gold from Al Usmani Orchards.', 1, 1),
        (?, 'prod-chaunsa', 'Dr. Sarah Naveed', 'Lahore', 5, 'Ordered 5 boxes for my family. The packaging is world-class export quality. Zero bruising, perfectly ripe.', 1, 1),
        (?, 'prod-sindhri', 'Syed Kazim Shah', 'Karachi', 5, 'Sindhri from Mirpur Khas is unmatched. Perfectly sweet with just the right touch of refreshing citrus. Will order again.', 1, 1),
        (?, 'prod-anwar-ratol', 'Adeel Mansha', 'Faisalabad', 5, 'Anwar Ratol is pure nostalgia. The perfume is intoxicating. Best mango harvest in Pakistan.', 1, 1)
    `).run(crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID());

    // 15. STORE SETTINGS (Al Usmani Orchards System Configuration)
    seedStoreSettings(db);

    console.log('Seeding complete! Admin credentials:');
    console.log('Email: admin@alusmaniorchards.pk | Password: AlUsmaniRoyal2026!');
  });
}

function seedStoreSettings(db: any) {
  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO store_settings (id, key, value_json, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `);

  const settings = [
    {
      key: 'general',
      value: {
        store_name: 'Al Usmani Orchards',
        tagline: 'From Our Orchards to Your Door.',
        positioning: 'Fresh from Our Orchards • Premium Pakistani Mangoes • Naturally Grown • Delivered with Care',
        estd_year: 1934,
        currency: 'PKR',
        currency_symbol: 'Rs.',
        timezone: 'Asia/Karachi'
      }
    },
    {
      key: 'contact',
      value: {
        support_email: 'harvest@alusmaniorchards.pk',
        phone: '+92 300 8472910',
        whatsapp: '+92 300 8472910',
        farm_locations: [
          { name: 'Multan Royal Estate', address: 'Shujabad Road, Multan, Punjab, Pakistan' },
          { name: 'Mirpur Khas Heritage Grove', address: 'Mirwah Gorchani, Mirpur Khas, Sindh, Pakistan' }
        ]
      }
    },
    {
      key: 'orders',
      value: {
        order_prefix: 'AUO-',
        next_order_number: 10245,
        auto_confirm: true,
        allow_guest_checkout: true,
        enable_gifting: true
      }
    },
    {
      key: 'shipping',
      value: {
        standard_shipping_fee: 350,
        free_shipping_threshold: 10000,
        express_shipping_fee: 600,
        estimated_days: '1 - 2 business days'
      }
    },
    {
      key: 'couriers',
      value: {
        active_couriers: ['cour-tcs', 'cour-leo', 'cour-mnp', 'cour-pakpost'],
        default_courier: 'cour-tcs'
      }
    },
    {
      key: 'email',
      value: {
        from_name: 'Al Usmani Orchards',
        from_email: 'harvest@alusmaniorchards.pk',
        admin_alert_email: 'orders@alusmaniorchards.pk',
        support_email: 'support@alusmaniorchards.pk',
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        smtp_secure: false,
        enable_customer_confirmations: true,
        enable_admin_alerts: true,
        enable_dispatch_updates: true
      }
    },
    {
      key: 'seo',
      value: {
        meta_title: 'Al Usmani Orchards | Fresh from Our Orchards • Premium Pakistani Mangoes',
        meta_description: 'From Our Orchards to Your Door. Hand-picked Multani Chaunsa, Sindhri, Anwar Ratol, Dussehri. Tree-ripened, 100% calcium carbide-free, nationwide 24h cold-chain dispatch.',
        keywords: 'Buy Chaunsa Mango Online, Al Usmani Orchards, Premium Pakistani Mangoes, Fresh Mango Delivery, Multan Mangoes'
      }
    },
    {
      key: 'security',
      value: {
        session_timeout_hours: 24,
        max_failed_attempts: 5
      }
    }
  ];

  for (const s of settings) {
    insertSetting.run(`set-${s.key}`, s.key, JSON.stringify(s.value));
  }
}

export function applySeedUpdates(db: any) {
  try {
    // 1. Update variety images to verified authentic mango photography (Eliminate pineapple & wrong images)
    db.prepare(`
      UPDATE mango_varieties 
      SET image_url = 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=1000&q=80'
      WHERE id = 'var-dussehri'
    `).run();

    db.prepare(`
      UPDATE mango_varieties 
      SET image_url = 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1000&q=80'
      WHERE id = 'var-white-chaunsa'
    `).run();

    db.prepare(`
      UPDATE mango_varieties 
      SET image_url = 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1000&q=80'
      WHERE id = 'var-chaunsa'
    `).run();

    db.prepare(`
      UPDATE mango_varieties 
      SET image_url = 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=1000&q=80'
      WHERE id = 'var-sindhri'
    `).run();

    db.prepare(`
      UPDATE mango_varieties 
      SET image_url = 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?auto=format&fit=crop&w=1000&q=80'
      WHERE id = 'var-anwar-ratol'
    `).run();

    // 2. Update/insert prod-dussehri
    const prodDussehri = db.prepare('SELECT id FROM products WHERE id = ?').get('prod-dussehri');
    if (!prodDussehri) {
      db.prepare(`
        INSERT INTO products (
          id, variety_id, name, slug, tagline, description, grade, harvest_season,
          ripeness_guide, is_featured, is_preorder_active, status, primary_image,
          seo_title, seo_description, created_at, updated_at
        ) VALUES (
          'prod-dussehri', 'var-dussehri', 'Royal Heritage Dussehri', 'royal-heritage-dussehri',
          'Ancient Mughal heirloom — sweet, melting pulp with floral aroma',
          'Cultivated in our century-old heritage royal groves. Oblong in shape with smooth tender melting pulp and an exquisite sweet bouquet beloved by connoisseurs for centuries.',
          'Export Grade A+ (Brix 22.5°+)', 'Late May – June 2026',
          'Ready when skin shows gentle saffron hues and gives softly to gentle touch.',
          1, 0, 'ACTIVE', 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=1000&q=80',
          'Buy Royal Heritage Dussehri Mangoes Online | Al Usmani Orchards',
          'Order authentic hand-picked Dussehri mangoes directly from Al Usmani Orchards. Nationwide 24h delivery with zero chemicals.',
          datetime('now'), datetime('now')
        )
      `).run();

      // Add packages for Dussehri
      const duPkgs = [
        { id: 'pkg-du-5', name: '5 KG Royal Gift Box', weight: 5.0, base: 2700, sale: 2400, sku: 'DU-BOX-5KG', stock: 55 },
        { id: 'pkg-du-8', name: '8 KG Family Crate', weight: 8.0, base: 4000, sale: 3600, sku: 'DU-BOX-8KG', stock: 40 },
        { id: 'pkg-du-10', name: '10 KG Connoisseur Feast', weight: 10.0, base: 5000, sale: 4400, sku: 'DU-BOX-10KG', stock: 30 }
      ];

      for (const p of duPkgs) {
        db.prepare(`
          INSERT INTO package_sizes (id, product_id, name, weight_kg, base_price, sale_price, wholesale_price, sku, is_active, sort_order)
          VALUES (?, 'prod-dussehri', ?, ?, ?, ?, ?, ?, 1, 0)
        `).run(p.id, p.name, p.weight, p.base, p.sale, Math.round(p.sale * 0.85), p.sku);

        const invId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO inventory (id, package_size_id, total_stock, available_stock, reserved_stock, sold_stock, damaged_stock, low_stock_threshold, updated_at)
          VALUES (?, ?, ?, ?, 0, 0, 0, 10, datetime('now'))
        `).run(invId, p.id, p.stock, p.stock);
      }
    }

    // 3. Update White Chaunsa product image
    db.prepare(`
      UPDATE products
      SET primary_image = 'https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&w=1000&q=80'
      WHERE id = 'prod-white-chaunsa'
    `).run();

    // 4. Update Couriers with logos and add Pakistan Post
    db.prepare(`
      UPDATE couriers 
      SET logo_url = '/images/couriers/tcs.svg', 
          tracking_url_template = 'https://www.tcsexpress.com/tracking?tracking_number={TRACKING_NO}' 
      WHERE id = 'cour-tcs'
    `).run();

    db.prepare(`
      UPDATE couriers 
      SET logo_url = '/images/couriers/leopards.svg', 
          tracking_url_template = 'https://www.leopardscourier.com/tracking?track_no={TRACKING_NO}' 
      WHERE id = 'cour-leo'
    `).run();

    db.prepare(`
      UPDATE couriers 
      SET logo_url = '/images/couriers/mp.svg', 
          tracking_url_template = 'https://mulphilog.com/tracking?consignment_no={TRACKING_NO}' 
      WHERE id = 'cour-mnp'
    `).run();

    const pakPost = db.prepare('SELECT id FROM couriers WHERE id = ?').get('cour-pakpost');
    if (!pakPost) {
      db.prepare(`
        INSERT INTO couriers (id, name, code, tracking_url_template, logo_url, cod_supported, is_active)
        VALUES ('cour-pakpost', 'Pakistan Post UMS Urgent Mail', 'PAKPOST', 'https://ep.gov.pk/track?track_id={TRACKING_NO}', '/images/couriers/pakpost.svg', 1, 1)
      `).run();
    }

    // 5. Ensure store_settings are seeded
    seedStoreSettings(db);

    // 6. Ensure Al Usmani super admin exists
    const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@alusmaniorchards.pk');
    if (!adminUser) {
      const defaultPasswordHash = hashPassword('AlUsmaniRoyal2026!');
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, phone, status, created_at, updated_at)
        VALUES (?, 'Mian Tariq Usmani', 'admin@alusmaniorchards.pk', ?, 'SUPER_ADMIN', '+92 300 8472910', 'ACTIVE', datetime('now'), datetime('now'))
      `).run(crypto.randomUUID(), defaultPasswordHash);
    }

    // 7. Update orders prefix to AUO if legacy MF exists
    db.prepare(`
      UPDATE orders 
      SET order_number = REPLACE(order_number, 'MF-2026-', 'AUO-')
      WHERE order_number LIKE 'MF-2026-%'
    `).run();

  } catch (err) {
    console.error('applySeedUpdates error:', err);
  }
}

function dateStr(offsetStr: string): string {
  const d = new Date();
  if (offsetStr.includes('days')) {
    const days = parseInt(offsetStr, 10);
    d.setDate(d.getDate() + days);
  }
  return d.toISOString().split('T')[0];
}

// Run only if invoked directly via CLI (e.g., npx tsx src/lib/db/seed.ts)
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase();
}
