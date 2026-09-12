import { getDatabase } from '../db';
import crypto from 'node:crypto';

export interface AuditLogEntry {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  previousState?: unknown;
  newState?: unknown;
  ipAddress?: string;
}

export function recordAuditLog(entry: AuditLogEntry): void {
  try {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO admin_audit_logs (
        id, user_id, user_email, action, resource_type, resource_id,
        previous_state, new_state, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      id,
      entry.userId || null,
      entry.userEmail || null,
      entry.action,
      entry.resourceType,
      entry.resourceId || null,
      entry.previousState ? JSON.stringify(entry.previousState) : null,
      entry.newState ? JSON.stringify(entry.newState) : null,
      entry.ipAddress || null
    );
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
}

export function getRecentAuditLogs(limit = 100): Array<{
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  previous_state: string | null;
  new_state: string | null;
  ip_address: string | null;
  created_at: string;
}> {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM admin_audit_logs 
    ORDER BY datetime(created_at) DESC 
    LIMIT ?
  `);
  return stmt.all(limit) as any[];
}
