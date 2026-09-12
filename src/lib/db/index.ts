import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'shahi_orchards.db');

declare global {
  // eslint-disable-next-line no-var
  var __shahi_db: DatabaseSync | undefined;
  // eslint-disable-next-line no-var
  var __shahi_tx_depth: number | undefined;
}

export function getDatabase(): DatabaseSync {
  if (global.__shahi_db) {
    return global.__shahi_db;
  }

  const db = new DatabaseSync(DB_PATH);
  
  // Set busy timeout FIRST so concurrent workers wait rather than immediately throwing SQLITE_BUSY
  try {
    db.exec('PRAGMA busy_timeout = 10000;');
  } catch (e) {
    // ignore
  }

  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch (e) {
    // If another worker/process is already switching journal mode, WAL is already enabled
  }

  try {
    db.exec('PRAGMA foreign_keys = ON;');
  } catch (e) {
    // ignore
  }

  global.__shahi_db = db;
  global.__shahi_tx_depth = 0;
  return db;
}

// Lazy getter for legacy imports
export const db = {
  get instance() {
    return getDatabase();
  }
};

export function runTransaction<T>(callback: (database: DatabaseSync) => T): T {
  const database = getDatabase();
  const depth = global.__shahi_tx_depth || 0;
  const isOuter = depth === 0;
  
  global.__shahi_tx_depth = depth + 1;

  if (isOuter) {
    database.exec('BEGIN TRANSACTION;');
  }

  try {
    const result = callback(database);
    if (isOuter) {
      database.exec('COMMIT;');
    }
    return result;
  } catch (error) {
    if (isOuter) {
      database.exec('ROLLBACK;');
    }
    throw error;
  } finally {
    global.__shahi_tx_depth = Math.max(0, (global.__shahi_tx_depth || 1) - 1);
  }
}
