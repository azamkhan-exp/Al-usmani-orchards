import { getDatabase } from '../db';
import { generateSessionToken, hashToken } from './crypto';
import { signSessionToken, verifySignedSessionToken } from './tokens';
import { cookies } from 'next/headers';

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE_MANAGER'
  | 'INVENTORY_MANAGER'
  | 'ORDER_MANAGER'
  | 'MARKETING_MANAGER'
  | 'SUPPORT_AGENT'
  | 'CUSTOMER';

export interface AuthenticatedUser {
  id: string;
  username?: string | null;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar_url?: string | null;
  email_verified?: number;
  mfa_enabled?: number;
  status: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*'], // Full access
  ADMIN: [
    'products:*', 'orders:*', 'inventory:*', 'preorders:*',
    'promotions:*', 'customers:*', 'shipping:*', 'finance:*',
    'farm:*', 'marketing:*', 'analytics:*', 'cms:*', 'settings:*', 'audit:read'
  ],
  FINANCE_MANAGER: [
    'finance:*', 'orders:read', 'payments:*', 'refunds:*',
    'analytics:read', 'audit:read'
  ],
  INVENTORY_MANAGER: [
    'inventory:*', 'products:*', 'farm:*', 'orders:read',
    'preorders:read', 'shipping:read'
  ],
  ORDER_MANAGER: [
    'orders:*', 'customers:read', 'shipping:*', 'inventory:read',
    'preorders:read'
  ],
  MARKETING_MANAGER: [
    'promotions:*', 'preorders:*', 'marketing:*', 'cms:*',
    'analytics:read', 'customers:read', 'products:read'
  ],
  SUPPORT_AGENT: [
    'orders:read', 'orders:update_notes', 'customers:read',
    'shipping:read', 'products:read', 'inventory:read'
  ],
  CUSTOMER: [
    'orders:own', 'profile:own', 'addresses:own'
  ]
};

export const SESSION_COOKIE_NAME = 'auo_session';
export const SESSION_EXPIRY_DAYS = 7;

export function isOwnerEmail(email: string): boolean {
  const ownerEmail = (process.env.ADMIN_OWNER_EMAIL || 'admin@alusmaniorchards.pk').trim().toLowerCase();
  return email.trim().toLowerCase() === ownerEmail;
}

export async function createSession(userId: string, ipAddress = '', userAgent = ''): Promise<string> {
  const db = getDatabase();
  const user = db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(userId) as any;
  const role: UserRole = user?.role || 'CUSTOMER';

  const { token, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const expSec = Math.floor(Date.now() / 1000) + SESSION_EXPIRY_DAYS * 24 * 60 * 60;
  const sessionId = crypto.randomUUID();

  const stmt = db.prepare(`
    INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(sessionId, userId, tokenHash, ipAddress, userAgent, expiresAt);

  // Update last_login_at on user
  db.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).run(userId);

  // Cryptographically sign the session cookie for tamper-proof Edge inspection
  const signedCookieValue = await signSessionToken(token, {
    userId,
    role,
    exp: expSec
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signedCookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60
  });

  return signedCookieValue;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(SESSION_COOKIE_NAME)?.value || cookieStore.get('shahi_session')?.value;
    if (!cookieVal) return null;

    // Verify cryptographic signature
    const { valid, rawToken } = await verifySignedSessionToken(cookieVal);
    const lookupToken = rawToken || cookieVal.split('.')[0];
    const tokenHash = hashToken(lookupToken);
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT u.id, u.username, u.name, u.email, u.role, u.phone, u.avatar_url, u.email_verified, u.mfa_enabled, u.status
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.status = 'ACTIVE'
    `);

    const user = stmt.get(tokenHash) as AuthenticatedUser | undefined;
    return user || null;
  } catch {
    return null;
  }
}

export async function getCurrentSessionTokenHash(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(SESSION_COOKIE_NAME)?.value || cookieStore.get('shahi_session')?.value;
    if (!cookieVal) return null;
    const { rawToken } = await verifySignedSessionToken(cookieVal);
    const lookupToken = rawToken || cookieVal.split('.')[0];
    return hashToken(lookupToken);
  } catch {
    return null;
  }
}

export interface UserSessionInfo {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  is_current: boolean;
}

export async function getUserActiveSessions(userId: string): Promise<UserSessionInfo[]> {
  const db = getDatabase();
  const currentTokenHash = await getCurrentSessionTokenHash();

  const rows = db.prepare(`
    SELECT id, ip_address, user_agent, created_at, expires_at, token_hash
    FROM user_sessions
    WHERE user_id = ? AND expires_at > datetime('now')
    ORDER BY created_at DESC
  `).all(userId) as Array<{
    id: string;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    expires_at: string;
    token_hash: string;
  }>;

  return rows.map(r => ({
    id: r.id,
    ip_address: r.ip_address,
    user_agent: r.user_agent,
    created_at: r.created_at,
    expires_at: r.expires_at,
    is_current: !!currentTokenHash && r.token_hash === currentTokenHash
  }));
}

export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM user_sessions WHERE id = ? AND user_id = ?').run(sessionId, userId);
  return res.changes > 0;
}

export async function revokeOtherSessions(userId: string): Promise<number> {
  const db = getDatabase();
  const currentTokenHash = await getCurrentSessionTokenHash();
  if (!currentTokenHash) return 0;

  const res = db.prepare('DELETE FROM user_sessions WHERE user_id = ? AND token_hash != ?').run(userId, currentTokenHash);
  return res.changes;
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(userId);
  return res.changes;
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(SESSION_COOKIE_NAME)?.value || cookieStore.get('shahi_session')?.value;
    if (cookieVal) {
      const rawToken = cookieVal.split('.')[0];
      const tokenHash = hashToken(rawToken);
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM user_sessions WHERE token_hash = ?');
      stmt.run(tokenHash);
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete('shahi_session');
  } catch (err) {
    console.error('Error destroying session:', err);
  }
}

export function hasPermission(userRole: UserRole, requiredPermission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  if (permissions.includes('*')) return true;
  if (permissions.includes(requiredPermission)) return true;

  // Wildcard prefix check, e.g. "finance:*" satisfies "finance:read"
  const [resource] = requiredPermission.split(':');
  if (permissions.includes(`${resource}:*`)) return true;

  return false;
}

export interface AuthGuardResult {
  authorized: boolean;
  user?: AuthenticatedUser;
  error?: string;
  status: number;
}

/**
 * Enforces authenticated administrative user status and optional granular permission check.
 */
export async function requireAdmin(requiredPermission?: string): Promise<AuthGuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { authorized: false, error: 'Authentication required. Please sign in to access.', status: 401 };
  }
  if (user.role === 'CUSTOMER') {
    return { authorized: false, error: "You don't have permission to access the admin dashboard.", status: 403 };
  }
  if (user.status !== 'ACTIVE') {
    return { authorized: false, error: 'Administrative account is inactive or suspended.', status: 403 };
  }
  if (requiredPermission && !hasPermission(user.role, requiredPermission)) {
    return { authorized: false, error: `Forbidden: Missing required authorization [${requiredPermission}].`, status: 403 };
  }
  return { authorized: true, user, status: 200 };
}

/**
 * Enforces active SUPER_ADMIN role with active status.
 */
export async function requireSuperAdmin(): Promise<AuthGuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { authorized: false, error: 'Authentication required. Please sign in to access.', status: 401 };
  }
  if (user.role !== 'SUPER_ADMIN') {
    return { authorized: false, error: 'Forbidden: Super Administrator privileges required.', status: 403 };
  }
  if (user.status !== 'ACTIVE') {
    return { authorized: false, error: 'Super Administrator account is inactive or suspended.', status: 403 };
  }
  return { authorized: true, user, status: 200 };
}

/**
 * Enforces that the current authenticated user belongs to one of the specified roles.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthGuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { authorized: false, error: 'Authentication required. Please sign in to access.', status: 401 };
  }
  if (!allowedRoles.includes(user.role)) {
    return { authorized: false, error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role.`, status: 403 };
  }
  if (user.status !== 'ACTIVE') {
    return { authorized: false, error: 'Administrative account is inactive or suspended.', status: 403 };
  }
  return { authorized: true, user, status: 200 };
}

