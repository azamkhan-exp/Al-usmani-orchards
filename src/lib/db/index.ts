import { Pool, PoolClient, QueryResult } from '@neondatabase/serverless';
import { AsyncLocalStorage } from 'node:async_hooks';

interface TxContext {
  client: PoolClient;
  depth: number;
}

const txStorage = new AsyncLocalStorage<TxContext>();

declare global {
  // eslint-disable-next-line no-var
  var __auo_pg_pool: Pool | undefined;
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

  // Use Neon serverless WebSocket connection pool (port 443 wss://)
  // Completely eliminates raw TCP port 5432 timeouts and socket freezes in serverless environments.
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
  });

  // Attach error listener to prevent idle client errors from triggering uncaughtException
  pool.on('error', (err: Error) => {
    console.error('[DB:PoolError] Neon pool error caught safely:', err?.message || err);
  });

  global.__auo_pg_pool = pool;
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

  // Rewrite SQLite datetime and date functions
  result = result.replace(/datetime\(\s*'now'\s*,\s*'([+-]?\d+)\s+(minutes?|hours?|days?|months?|years?)'\s*\)/gi, "(CURRENT_TIMESTAMP + INTERVAL '$1 $2')");
  result = result.replace(/datetime\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP');
  result = result.replace(/date\(\s*'now'\s*\)/gi, 'CURRENT_DATE');
  result = result.replace(/ORDER\s+BY\s+datetime\(([^)]+)\)/gi, 'ORDER BY $1');
  result = result.replace(/datetime\(([^)]+)\)/gi, '$1');

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
          if (!res || !Array.isArray(res.rows)) {
            return [];
          }
          return res.rows;
        },
        get: async (...params: any[]): Promise<any> => {
          const flat = flattenParams(params);
          const res = await queryExecutor(translatedSql, flat);
          if (!res || !res.rows || res.rows.length === 0) {
            return undefined;
          }
          return res.rows[0];
        },
        run: async (...params: any[]) => {
          const flat = flattenParams(params);
          const res = await queryExecutor(translatedSql, flat);
          return {
            changes: res?.rowCount ?? 0,
            rowCount: res?.rowCount ?? 0
          };
        }
      };
    }
  };
}

export function getDatabase(): DatabaseAdapter {
  // If an active transaction exists for the current async execution context, route to the transaction client!
  const tx = txStorage.getStore();
  if (tx?.client) {
    return createAdapter((sql, params) => tx.client.query(sql, params));
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
  const tx = txStorage.getStore();

  if (tx && tx.depth > 0) {
    // Nested transaction using PostgreSQL savepoint
    const nextDepth = tx.depth + 1;
    const spName = `sp_depth_${nextDepth}`;
    tx.depth = nextDepth;
    await tx.client.query(`SAVEPOINT ${spName}`);
    try {
      const adapter = createAdapter((sql, params) => tx.client.query(sql, params));
      const result = await callback(adapter);
      await tx.client.query(`RELEASE SAVEPOINT ${spName}`);
      return result;
    } catch (err) {
      try {
        await tx.client.query(`ROLLBACK TO SAVEPOINT ${spName}`);
      } catch {
        // ignore if client closed
      }
      throw err;
    } finally {
      tx.depth = Math.max(1, tx.depth - 1);
    }
  }

  // Root transaction isolated to this async execution context via AsyncLocalStorage
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await txStorage.run({ client, depth: 1 }, async () => {
      const adapter = createAdapter((sql, params) => client.query(sql, params));
      return await callback(adapter);
    });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore if client closed
    }
    throw err;
  } finally {
    client.release();
  }
}
