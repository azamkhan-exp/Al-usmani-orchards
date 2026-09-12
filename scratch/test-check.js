const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/shahi_orchards.db');
try {
  db.prepare("UPDATE products SET status = 'SEASONAL' WHERE id = 'prod-chaunsa'").run();
  console.log('SUCCESS');
  // Revert back
  db.prepare("UPDATE products SET status = 'ACTIVE' WHERE id = 'prod-chaunsa'").run();
} catch (e) {
  console.log('FAILED:', e.message);
}
