const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'shahi_orchards.db');
const db = new DatabaseSync(dbPath);

db.exec(`
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
`);

const check = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_invitations'").get();
console.log('admin_invitations table created:', check);
