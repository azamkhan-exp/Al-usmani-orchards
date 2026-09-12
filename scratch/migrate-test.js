const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/shahi_orchards.db');

try {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS products_v2 (
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
  `);
  db.exec('INSERT INTO products_v2 SELECT * FROM products;');
  db.exec('DROP TABLE products;');
  db.exec('ALTER TABLE products_v2 RENAME TO products;');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_variety ON products(variety_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);');
  db.exec('PRAGMA foreign_keys = ON;');

  // Now test updating to SEASONAL
  db.prepare("UPDATE products SET status = 'SEASONAL' WHERE id = 'prod-chaunsa'").run();
  console.log('SEASONAL update succeeded!');
  db.prepare("UPDATE products SET status = 'ACTIVE' WHERE id = 'prod-chaunsa'").run();
  console.log('ACTIVE update succeeded! Migration verified.');
} catch (e) {
  console.error('Migration test error:', e);
}
