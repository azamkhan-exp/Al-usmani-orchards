const { getDatabase } = require('../src/lib/db');
const { ensureDatabaseReady } = require('../src/lib/db/init');

ensureDatabaseReady();
const db = getDatabase();

console.log('Inspecting foreign keys and schema...');
const tables = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type='table'`).all();
for (const t of tables) {
  if (t.sql && t.sql.includes('_orders_old')) {
    console.log(`Table ${t.name} references _orders_old! Recreating table...`);
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
    console.log(`Table ${t.name} successfully repaired to point to orders(id).`);
  }
}

console.log('Database repair check completed.');
