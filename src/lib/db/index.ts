import { Pool, PoolClient, QueryResult } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __auo_pg_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __auo_current_tx_client: PoolClient | undefined;
  // eslint-disable-next-line no-var
  var __auo_tx_depth: number | undefined;
}

export function getPool(): Pool {
  if (global.__auo_pg_pool) {
    return global.__auo_pg_pool;
  }

  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    try {
      // Safe fallback for CLI scripts / tsx test runners
      const fs = require('node:fs');
      const path = require('node:path');
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^DATABASE_URL=(.+)$/m);
        if (match) {
          connectionString = match[1].trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // Ignore if filesystem read fails
    }
  }

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000
  });

  global.__auo_pg_pool = pool;
  global.__auo_tx_depth = 0;
  return pool;
}

/**
 * Translates SQLite query quirks into clean PostgreSQL syntax:
 * - Replaces '?' placeholders with '$1, $2, $3...' (ignoring string literals)
 * - Translates INSERT OR IGNORE INTO -> INSERT INTO ... ON CONFLICT DO NOTHING
 * - Translates sqlite_master -> information_schema.tables
 */
export function translateSql(sql: string): string {
  let inString = false;
  let quoteChar = '';
  let paramIndex = 1;
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const prevChar = i > 0 ? sql[i - 1] : '';

    if (!inString && (char === "'" || char === '"')) {
      inString = true;
      quoteChar = char;
      result += char;
    } else if (inString && char === quoteChar && prevChar !== '\\') {
      inString = false;
      quoteChar = '';
      result += char;
    } else if (!inString && char === '?') {
      result += `$${paramIndex++}`;
    } else {
      result += char;
    }
  }

  // Rewrite INSERT OR IGNORE
  result = result.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  if (/INSERT\s+INTO\s+feature_flags/i.test(result) && !result.toLowerCase().includes('on conflict')) {
    result = result.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING;');
  }

  // Rewrite INSERT OR REPLACE
  if (/INSERT\s+OR\s+REPLACE\s+INTO\s+store_settings/i.test(result)) {
    result = result.replace(/INSERT\s+OR\s+REPLACE\s+INTO\s+store_settings/i, 'INSERT INTO store_settings');
    if (!result.toLowerCase().includes('on conflict')) {
      result = result.replace(/;?\s*$/, ' ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = EXCLUDED.updated_at;');
    }
  }

  // Rewrite sqlite_master checks
  if (result.includes('sqlite_master')) {
    result = result.replace(/FROM\s+sqlite_master\s+WHERE\s+type\s*=\s*'table'/gi, "FROM information_schema.tables WHERE table_schema = 'public'");
    result = result.replace(/name\s*=/gi, 'table_name =');
  }

  return result;
}

export function flattenParams(params: any[]): any[] {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }
  return params;
}

export interface StatementWrapper {
  all: (...params: any[]) => Promise<any[]>;
  get: (...params: any[]) => Promise<any>;
  run: (...params: any[]) => Promise<{ changes: number; rowCount: number; lastInsertRowid?: any }>;
}

export interface DatabaseAdapter {
  prepare: (sql: string) => StatementWrapper;
  exec: (sql: string) => Promise<void>;
  query: (sql: string, params?: any[]) => Promise<QueryResult<any>>;
}

function createAdapter(queryExecutor: (sql: string, params?: any[]) => Promise<QueryResult<any>>): DatabaseAdapter {
  return {
    query: queryExecutor,
    exec: async (sql: string) => {
      await queryExecutor(sql);
    },
    prepare: (sql: string): StatementWrapper => {
      const translatedSql = translateSql(sql);
      return {
        all: async (...params: any[]): Promise<any[]> => {
          const flat = flattenParams(params);
          const res = await queryExecutor(translatedSql, flat);
          return res.rows;
        },
        get: async (...params: any[]): Promise<any> => {
          const flat = flattenParams(params);
          const res = await queryExecutor(translatedSql, flat);
          return res.rows[0];
        },
        run: async (...params: any[]) => {
          const flat = flattenParams(params);
          const res = await queryExecutor(translatedSql, flat);
          return {
            changes: res.rowCount ?? 0,
            rowCount: res.rowCount ?? 0
          };
        }
      };
    }
  };
}

export function getDatabase(): DatabaseAdapter {
  // If we are currently inside an active transaction, route to the transaction client!
  if (global.__auo_current_tx_client) {
    return createAdapter((sql, params) => global.__auo_current_tx_client!.query(sql, params));
  }

  const pool = getPool();
  return createAdapter((sql, params) => pool.query(sql, params));
}

// Lazy getter for legacy db.instance imports
export const db = {
  get instance() {
    return getDatabase();
  }
};

export async function runTransaction<T>(callback: (database: DatabaseAdapter) => Promise<T> | T): Promise<T> {
  const pool = getPool();
  const existingClient = global.__auo_current_tx_client;
  const depth = global.__auo_tx_depth || 0;

  if (existingClient && depth > 0) {
    // Nested transaction using PostgreSQL savepoint
    const spName = `sp_depth_${depth}`;
    global.__auo_tx_depth = depth + 1;
    await existingClient.query(`SAVEPOINT ${spName}`);
    try {
      const adapter = createAdapter((sql, params) => existingClient.query(sql, params));
      const result = await callback(adapter);
      await existingClient.query(`RELEASE SAVEPOINT ${spName}`);
      return result;
    } catch (err) {
      await existingClient.query(`ROLLBACK TO SAVEPOINT ${spName}`);
      throw err;
    } finally {
      global.__auo_tx_depth = Math.max(1, (global.__auo_tx_depth || 1) - 1);
    }
  }

  // Root transaction
  const client = await pool.connect();
  global.__auo_current_tx_client = client;
  global.__auo_tx_depth = 1;

  try {
    await client.query('BEGIN');
    const adapter = createAdapter((sql, params) => client.query(sql, params));
    const result = await callback(adapter);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    global.__auo_current_tx_client = undefined;
    global.__auo_tx_depth = 0;
    client.release();
  }
}
