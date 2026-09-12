import { getDatabase, runTransaction } from '../db';
import { ensureDatabaseReady } from '../db/init';
import { hashPassword } from '../auth/crypto';
import { isOwnerEmail, UserRole, createSession } from '../auth/session';
import { recordAuditLog } from './audit.service';
import { sendEmail } from '../email';
import crypto from 'node:crypto';

export const VALID_ADMIN_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE_MANAGER',
  'INVENTORY_MANAGER',
  'ORDER_MANAGER',
  'MARKETING_MANAGER',
  'SUPPORT_AGENT'
];

export interface AdminUserSummary {
  id: string;
  name: string;
  username: string | null;
  email: string;
  phone: string | null;
  security_phone: string | null;
  security_phone_verified: boolean;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  is_owner: boolean;
  active_sessions: number;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminInvitationSummary {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  invited_by: string | null;
  invited_by_name?: string | null;
  expires_at: string;
  is_accepted: boolean;
  created_at: string;
}

/**
 * Lists all administrative users and active pending invitations.
 */
export function listAdminUsers(): {
  admins: AdminUserSummary[];
  invitations: AdminInvitationSummary[];
  totalActiveAdmins: number;
  superAdminCount: number;
} {
  ensureDatabaseReady();
  const db = getDatabase();

  const rolePlaceholders = VALID_ADMIN_ROLES.map(() => '?').join(', ');
  const adminUsers = db.prepare(`
    SELECT 
      u.id, u.name, u.username, u.email, u.phone, u.security_phone,
      u.security_phone_verified, u.role, u.status, u.last_login_at, u.created_at,
      (SELECT COUNT(*) FROM user_sessions s WHERE s.user_id = u.id AND s.expires_at > datetime('now')) as active_sessions
    FROM users u
    WHERE u.role IN (${rolePlaceholders})
    ORDER BY 
      CASE u.role
        WHEN 'SUPER_ADMIN' THEN 1
        WHEN 'ADMIN' THEN 2
        WHEN 'FINANCE_MANAGER' THEN 3
        WHEN 'INVENTORY_MANAGER' THEN 4
        WHEN 'ORDER_MANAGER' THEN 5
        WHEN 'MARKETING_MANAGER' THEN 6
        WHEN 'SUPPORT_AGENT' THEN 7
        ELSE 8
      END,
      u.created_at ASC
  `).all(...VALID_ADMIN_ROLES) as any[];

  const invitations = db.prepare(`
    SELECT 
      inv.id, inv.email, inv.name, inv.role, inv.invited_by, inv.expires_at, inv.is_accepted, inv.created_at,
      u.name as invited_by_name
    FROM admin_invitations inv
    LEFT JOIN users u ON u.id = inv.invited_by
    WHERE inv.is_accepted = 0 AND inv.expires_at > datetime('now')
    ORDER BY inv.created_at DESC
  `).all() as any[];

  const admins: AdminUserSummary[] = adminUsers.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username || null,
    email: u.email,
    phone: u.phone || null,
    security_phone: u.security_phone || null,
    security_phone_verified: u.security_phone_verified === 1,
    role: u.role as UserRole,
    status: u.status,
    is_owner: isOwnerEmail(u.email),
    active_sessions: Number(u.active_sessions || 0),
    last_login_at: u.last_login_at || null,
    created_at: u.created_at
  }));

  const totalActiveAdmins = admins.filter(a => a.status === 'ACTIVE').length;
  const superAdminCount = admins.filter(a => a.role === 'SUPER_ADMIN' && a.status === 'ACTIVE').length;

  return {
    admins,
    invitations: invitations.map((i) => ({
      id: i.id,
      email: i.email,
      name: i.name || null,
      role: i.role as UserRole,
      invited_by: i.invited_by,
      invited_by_name: i.invited_by_name || 'Super Admin',
      expires_at: i.expires_at,
      is_accepted: i.is_accepted === 1,
      created_at: i.created_at
    })),
    totalActiveAdmins,
    superAdminCount
  };
}

/**
 * Creates an administrator record directly with credentials.
 */
export function createAdminUserDirectly(params: {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  phone?: string;
  actorUserId?: string;
  actorUserEmail?: string;
}): { success: boolean; user?: AdminUserSummary; error?: string } {
  ensureDatabaseReady();
  const db = getDatabase();

  const cleanEmail = (params.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'A valid email address is required.' };
  }

  if (!params.name || params.name.trim().length < 2) {
    return { success: false, error: 'Full name must be at least 2 characters.' };
  }

  if (!VALID_ADMIN_ROLES.includes(params.role)) {
    return { success: false, error: `Invalid administrative role: ${params.role}` };
  }

  if (!params.password || params.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters in length.' };
  }

  const existingUser = db.prepare('SELECT id, role, email FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;
  if (existingUser) {
    if (VALID_ADMIN_ROLES.includes(existingUser.role)) {
      return { success: false, error: 'That user is already an administrator.' };
    }
    // Promote customer to administrative role
    const passwordHash = hashPassword(params.password);
    db.prepare(`
      UPDATE users 
      SET name = ?, role = ?, password_hash = ?, phone = COALESCE(?, phone), status = 'ACTIVE', updated_at = datetime('now')
      WHERE id = ?
    `).run(params.name.trim(), params.role, passwordHash, params.phone?.trim() || null, existingUser.id);

    recordAuditLog({
      userId: params.actorUserId,
      userEmail: params.actorUserEmail,
      action: 'ADMIN_CREATED',
      resourceType: 'ADMIN_USER',
      resourceId: existingUser.id,
      newState: { email: cleanEmail, role: params.role, promotedFromCustomer: true }
    });

    return {
      success: true,
      user: {
        id: existingUser.id,
        name: params.name.trim(),
        username: null,
        email: cleanEmail,
        phone: params.phone?.trim() || null,
        security_phone: null,
        security_phone_verified: false,
        role: params.role,
        status: 'ACTIVE',
        is_owner: isOwnerEmail(cleanEmail),
        active_sessions: 0,
        last_login_at: null,
        created_at: new Date().toISOString()
      }
    };
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(params.password);

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, email_verified, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 'ACTIVE', datetime('now'), datetime('now'))
  `).run(
    userId,
    params.name.trim(),
    cleanEmail,
    passwordHash,
    params.role,
    params.phone?.trim() || null
  );

  recordAuditLog({
    userId: params.actorUserId,
    userEmail: params.actorUserEmail,
    action: 'ADMIN_CREATED',
    resourceType: 'ADMIN_USER',
    resourceId: userId,
    newState: { email: cleanEmail, role: params.role }
  });

  return {
    success: true,
    user: {
      id: userId,
      name: params.name.trim(),
      username: null,
      email: cleanEmail,
      phone: params.phone?.trim() || null,
      security_phone: null,
      security_phone_verified: false,
      role: params.role,
      status: 'ACTIVE',
      is_owner: isOwnerEmail(cleanEmail),
      active_sessions: 0,
      last_login_at: null,
      created_at: new Date().toISOString()
    }
  };
}

/**
 * Creates an expiring, cryptographically secure invitation for a new administrator.
 */
export async function createAdminInvitation(params: {
  email: string;
  role: UserRole;
  name?: string;
  appBaseUrl?: string;
  invitedByUserId?: string;
  invitedByUserEmail?: string;
}): Promise<{
  success: boolean;
  invitationId?: string;
  inviteToken?: string;
  inviteUrl?: string;
  emailDeliveryStatus?: string;
  error?: string;
}> {
  ensureDatabaseReady();
  const db = getDatabase();

  const cleanEmail = (params.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'A valid recipient email address is required.' };
  }

  if (!VALID_ADMIN_ROLES.includes(params.role)) {
    return { success: false, error: `Invalid administrative role: ${params.role}` };
  }

  // Check if email already belongs to an active administrator
  const existingAdmin = db.prepare(`
    SELECT id, email, role, status FROM users WHERE LOWER(email) = ? AND role IN (${VALID_ADMIN_ROLES.map(() => '?').join(',')})
  `).get(cleanEmail, ...VALID_ADMIN_ROLES) as any;

  if (existingAdmin && existingAdmin.status === 'ACTIVE') {
    return { success: false, error: 'That user is already an administrator.' };
  }

  // Generate 256-bit cryptographic token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const invitationId = `inv_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 Hours expiration

  // Invalidate any existing pending invitation for this email
  db.prepare(`DELETE FROM admin_invitations WHERE LOWER(email) = ?`).run(cleanEmail);

  db.prepare(`
    INSERT INTO admin_invitations (
      id, email, name, role, token_hash, invited_by, expires_at, is_accepted, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(
    invitationId,
    cleanEmail,
    params.name?.trim() || null,
    params.role,
    tokenHash,
    params.invitedByUserId || null,
    expiresAt
  );

  const baseUrl = (params.appBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const inviteUrl = `${baseUrl}/admin/accept-invitation?token=${rawToken}`;

  // Attempt non-blocking transactional email notification
  let emailStatus = 'SIMULATED';
  try {
    const emailResult = await sendEmail({
      to: cleanEmail,
      subject: `Al Usmani Orchards: Administrative Appointment Invitation (${params.role.replace(/_/g, ' ')})`,
      type: 'ADMIN_ALERT',
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FDFBF7; padding: 32px; border: 1px solid #E8DBC5; border-radius: 16px;">
          <h1 style="color: #113824; font-size: 24px; margin-bottom: 8px;">Al Usmani Orchards</h1>
          <p style="color: #D97706; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 2px;">Administrative Appointment</p>
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin-top: 16px;">
            Hello${params.name ? ` ${params.name}` : ''},<br/><br/>
            You have been appointed to an administrative role as <strong>${params.role.replace(/_/g, ' ')}</strong> on the Al Usmani Orchards production command console.
          </p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${inviteUrl}" style="display: inline-block; background: #113824; color: #FDFBF7; padding: 12px 28px; font-weight: bold; text-decoration: none; border-radius: 12px; font-size: 14px;">
              Accept Appointment & Set Password
            </a>
          </div>
          <p style="color: #6B7280; font-size: 12px; line-height: 1.5;">
            Or copy and paste this link into your browser:<br/>
            <code style="background: #E5E7EB; padding: 2px 6px; border-radius: 4px; font-size: 11px; word-break: break-all;">${inviteUrl}</code>
          </p>
          <p style="color: #9CA3AF; font-size: 11px; margin-top: 24px;">
            This single-use cryptographic invitation link expires in 48 hours.
          </p>
        </div>
      `
    });
    emailStatus = emailResult.status;
  } catch (emailErr) {
    console.warn('[ADMIN_INVITE] Email dispatch fell back to link:', emailErr);
  }

  recordAuditLog({
    userId: params.invitedByUserId,
    userEmail: params.invitedByUserEmail,
    action: 'ADMIN_INVITATION_SENT',
    resourceType: 'ADMIN_INVITATION',
    resourceId: invitationId,
    newState: { email: cleanEmail, role: params.role, expiresAt }
  });

  return {
    success: true,
    invitationId,
    inviteToken: rawToken,
    inviteUrl,
    emailDeliveryStatus: emailStatus
  };
}

/**
 * Authorizes a user as an administrator by email address.
 * Follows Phase 4 & Phase 5 requirements:
 * - Validates email and role.
 * - Checks if user exists.
 * - If already an active administrator: returns { success: false, error: 'That user is already an administrator.' }
 * - If user exists as a customer: updates role to the assigned administrative role, sets status ACTIVE, logs audit trail, returns "Administrator added successfully."
 * - If user does not exist: creates a 48-hour secure invitation token, returns "Administrator added successfully." with invitation link.
 */
export async function authorizeAdminByEmail(params: {
  email: string;
  role: UserRole;
  actorUserId?: string;
  actorUserEmail?: string;
  appBaseUrl?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  isAlreadyAdmin?: boolean;
  user?: AdminUserSummary;
  invitationUrl?: string;
}> {
  ensureDatabaseReady();
  const db = getDatabase();

  const cleanEmail = (params.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'A valid email address is required.' };
  }

  if (!VALID_ADMIN_ROLES.includes(params.role)) {
    return { success: false, error: `Invalid administrative role: ${params.role}` };
  }

  const existingUser = db.prepare('SELECT id, name, role, email, status FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;

  if (existingUser) {
    if (VALID_ADMIN_ROLES.includes(existingUser.role)) {
      return {
        success: false,
        isAlreadyAdmin: true,
        error: 'That user is already an administrator.'
      };
    }

    // Existing customer -> promote to administrative staff
    db.prepare(`
      UPDATE users
      SET role = ?, status = 'ACTIVE', updated_at = datetime('now')
      WHERE id = ?
    `).run(params.role, existingUser.id);

    recordAuditLog({
      userId: params.actorUserId,
      userEmail: params.actorUserEmail,
      action: 'ADMIN_PROMOTED_BY_EMAIL',
      resourceType: 'ADMIN_USER',
      resourceId: existingUser.id,
      newState: { email: cleanEmail, role: params.role, previousRole: existingUser.role }
    });

    return {
      success: true,
      message: 'Administrator added successfully.',
      user: {
        id: existingUser.id,
        name: existingUser.name,
        username: null,
        email: cleanEmail,
        phone: null,
        security_phone: null,
        security_phone_verified: false,
        role: params.role,
        status: 'ACTIVE',
        is_owner: isOwnerEmail(cleanEmail),
        active_sessions: 0,
        last_login_at: null,
        created_at: new Date().toISOString()
      }
    };
  }

  // User does not yet exist -> issue 48-hour secure onboarding invitation
  const inviteResult = await createAdminInvitation({
    email: cleanEmail,
    role: params.role,
    appBaseUrl: params.appBaseUrl,
    invitedByUserId: params.actorUserId,
    invitedByUserEmail: params.actorUserEmail
  });

  if (!inviteResult.success) {
    return { success: false, error: inviteResult.error || 'Failed to issue administrator invitation.' };
  }

  return {
    success: true,
    message: 'Administrator added successfully.',
    invitationUrl: inviteResult.inviteUrl
  };
}

/**
 * Validates an invitation token for the acceptance UI.
 */
export function validateInvitationToken(token: string): {
  valid: boolean;
  email?: string;
  name?: string | null;
  role?: UserRole;
  expires_at?: string;
  error?: string;
} {
  ensureDatabaseReady();
  const db = getDatabase();

  if (!token || token.trim().length < 16) {
    return { valid: false, error: 'Invalid invitation token.' };
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const row = db.prepare(`
    SELECT id, email, name, role, expires_at, is_accepted, (expires_at <= datetime('now')) as is_expired
    FROM admin_invitations
    WHERE token_hash = ?
  `).get(tokenHash) as any;

  if (!row) {
    return { valid: false, error: 'Invitation not found or invalid.' };
  }

  if (row.is_accepted === 1) {
    return { valid: false, error: 'This invitation has already been accepted.' };
  }

  if (row.is_expired === 1) {
    return { valid: false, error: 'This invitation link has expired. Please request a new invitation.' };
  }

  return {
    valid: true,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    expires_at: row.expires_at
  };
}

/**
 * Accepts an invitation, sets the administrator password, creates the account, and issues a session.
 */
export async function acceptAdminInvitation(params: {
  token: string;
  name: string;
  password: string;
  phone?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{
  success: boolean;
  user?: AdminUserSummary;
  sessionCookie?: string;
  error?: string;
}> {
  ensureDatabaseReady();
  const db = getDatabase();

  const validation = validateInvitationToken(params.token);
  if (!validation.valid || !validation.email || !validation.role) {
    return { success: false, error: validation.error || 'Invalid invitation.' };
  }

  if (!params.name || params.name.trim().length < 2) {
    return { success: false, error: 'Please enter your full name.' };
  }

  if (!params.password || params.password.length < 8) {
    return { success: false, error: 'Master password must be at least 8 characters.' };
  }

  const tokenHash = crypto.createHash('sha256').update(params.token.trim()).digest('hex');
  const cleanEmail = validation.email.toLowerCase();
  const passwordHash = hashPassword(params.password);

  let userId: string;

  const result = runTransaction((txDb) => {
    // Mark invitation as accepted
    txDb.prepare(`
      UPDATE admin_invitations 
      SET is_accepted = 1, accepted_at = datetime('now')
      WHERE token_hash = ?
    `).run(tokenHash);

    // Check if user exists
    const existing = txDb.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;
    if (existing) {
      userId = existing.id;
      txDb.prepare(`
        UPDATE users 
        SET name = ?, password_hash = ?, role = ?, phone = COALESCE(?, phone),
            status = 'ACTIVE', email_verified = 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(params.name.trim(), passwordHash, validation.role, params.phone?.trim() || null, userId);
    } else {
      userId = crypto.randomUUID();
      txDb.prepare(`
        INSERT INTO users (
          id, name, email, password_hash, role, phone, email_verified, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 'ACTIVE', datetime('now'), datetime('now'))
      `).run(userId, params.name.trim(), cleanEmail, passwordHash, validation.role, params.phone?.trim() || null);
    }
  });

  // Create active session
  const sessionCookie = await createSession(
    userId!,
    params.ipAddress || '127.0.0.1',
    params.userAgent || 'StaffOnboarding'
  );

  recordAuditLog({
    userId: userId!,
    userEmail: cleanEmail,
    action: 'ADMIN_INVITATION_ACCEPTED',
    resourceType: 'ADMIN_USER',
    resourceId: userId!,
    newState: { email: cleanEmail, role: validation.role }
  });

  return {
    success: true,
    user: {
      id: userId!,
      name: params.name.trim(),
      username: null,
      email: cleanEmail,
      phone: params.phone?.trim() || null,
      security_phone: null,
      security_phone_verified: false,
      role: validation.role,
      status: 'ACTIVE',
      is_owner: isOwnerEmail(cleanEmail),
      active_sessions: 1,
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    sessionCookie
  };
}

/**
 * Updates an administrator's role with strict Super Admin protection.
 */
export function updateAdminRole(params: {
  targetUserId: string;
  newRole: UserRole;
  actorUserId: string;
  actorUserEmail: string;
}): { success: boolean; error?: string } {
  ensureDatabaseReady();
  const db = getDatabase();

  if (!VALID_ADMIN_ROLES.includes(params.newRole)) {
    return { success: false, error: `Invalid role: ${params.newRole}` };
  }

  const target = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(params.targetUserId) as any;
  if (!target) {
    return { success: false, error: 'Target user not found.' };
  }

  if (target.role === params.newRole) {
    return { success: true };
  }

  // Super Admin Demotion Protection
  if (target.role === 'SUPER_ADMIN' && params.newRole !== 'SUPER_ADMIN') {
    const otherSuperAdmins = db.prepare(`
      SELECT count(*) as c FROM users WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE' AND id != ?
    `).get(params.targetUserId) as { c: number };

    if (!otherSuperAdmins || otherSuperAdmins.c < 1) {
      return {
        success: false,
        error: 'Operation rejected: Cannot demote the sole active Super Administrator. At least one active Super Administrator must always exist.'
      };
    }

    if (isOwnerEmail(target.email)) {
      return {
        success: false,
        error: 'Operation rejected: Cannot modify the role of the authoritative orchard owner account.'
      };
    }
  }

  db.prepare(`UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`).run(params.newRole, params.targetUserId);

  recordAuditLog({
    userId: params.actorUserId,
    userEmail: params.actorUserEmail,
    action: 'ADMIN_ROLE_CHANGED',
    resourceType: 'ADMIN_USER',
    resourceId: params.targetUserId,
    previousState: { role: target.role },
    newState: { role: params.newRole }
  });

  return { success: true };
}

/**
 * Updates an administrator's status (ACTIVE vs SUSPENDED) with Super Admin protection.
 */
export function updateAdminStatus(params: {
  targetUserId: string;
  newStatus: 'ACTIVE' | 'SUSPENDED';
  actorUserId: string;
  actorUserEmail: string;
}): { success: boolean; error?: string } {
  ensureDatabaseReady();
  const db = getDatabase();

  const target = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(params.targetUserId) as any;
  if (!target) {
    return { success: false, error: 'Target user not found.' };
  }

  if (target.status === params.newStatus) {
    return { success: true };
  }

  // Super Admin Suspension Protection
  if (target.role === 'SUPER_ADMIN' && params.newStatus === 'SUSPENDED') {
    const otherSuperAdmins = db.prepare(`
      SELECT count(*) as c FROM users WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE' AND id != ?
    `).get(params.targetUserId) as { c: number };

    if (!otherSuperAdmins || otherSuperAdmins.c < 1) {
      return {
        success: false,
        error: 'Operation rejected: Cannot suspend the sole active Super Administrator.'
      };
    }

    if (isOwnerEmail(target.email)) {
      return {
        success: false,
        error: 'Operation rejected: Cannot suspend the authoritative orchard owner account.'
      };
    }
  }

  runTransaction((txDb) => {
    txDb.prepare(`UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(params.newStatus, params.targetUserId);
    if (params.newStatus === 'SUSPENDED') {
      // Immediately revoke all active sessions
      txDb.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(params.targetUserId);
    }
  });

  recordAuditLog({
    userId: params.actorUserId,
    userEmail: params.actorUserEmail,
    action: params.newStatus === 'ACTIVE' ? 'ADMIN_ENABLED' : 'ADMIN_DISABLED',
    resourceType: 'ADMIN_USER',
    resourceId: params.targetUserId,
    previousState: { status: target.status },
    newState: { status: params.newStatus }
  });

  return { success: true };
}

/**
 * Deletes an administrator with Super Admin protection.
 */
export function deleteAdminUser(params: {
  targetUserId: string;
  actorUserId: string;
  actorUserEmail: string;
}): { success: boolean; error?: string } {
  ensureDatabaseReady();
  const db = getDatabase();

  const target = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(params.targetUserId) as any;
  if (!target) {
    return { success: false, error: 'Target administrator not found.' };
  }

  // Super Admin Removal Protection
  if (target.role === 'SUPER_ADMIN') {
    const otherSuperAdmins = db.prepare(`
      SELECT count(*) as c FROM users WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE' AND id != ?
    `).get(params.targetUserId) as { c: number };

    if (!otherSuperAdmins || otherSuperAdmins.c < 1) {
      return {
        success: false,
        error: 'Operation rejected: Cannot remove the sole active Super Administrator.'
      };
    }

    if (isOwnerEmail(target.email)) {
      return {
        success: false,
        error: 'Operation rejected: Cannot delete the authoritative orchard owner account.'
      };
    }
  }

  runTransaction((txDb) => {
    // Purge active sessions
    txDb.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(params.targetUserId);

    // Check if user has associated customer orders
    const hasOrders = txDb.prepare('SELECT count(*) as c FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE user_id = ?)').get(params.targetUserId) as any;
    if (hasOrders && hasOrders.c > 0) {
      // Demote to customer rather than breaking relational integrity
      txDb.prepare("UPDATE users SET role = 'CUSTOMER', status = 'ACTIVE', updated_at = datetime('now') WHERE id = ?").run(params.targetUserId);
    } else {
      txDb.prepare('DELETE FROM users WHERE id = ?').run(params.targetUserId);
    }
  });

  recordAuditLog({
    userId: params.actorUserId,
    userEmail: params.actorUserEmail,
    action: 'ADMIN_REMOVED',
    resourceType: 'ADMIN_USER',
    resourceId: params.targetUserId,
    previousState: { email: target.email, role: target.role }
  });

  return { success: true };
}

/**
 * Revokes all sessions for a specific administrator immediately.
 */
export function revokeAdminSessions(params: {
  targetUserId: string;
  actorUserId: string;
  actorUserEmail: string;
}): { success: boolean; revokedCount: number; error?: string } {
  ensureDatabaseReady();
  const db = getDatabase();

  const res = db.prepare('DELETE FROM user_sessions WHERE user_id = ?').run(params.targetUserId);

  recordAuditLog({
    userId: params.actorUserId,
    userEmail: params.actorUserEmail,
    action: 'ADMIN_SESSION_REVOKED',
    resourceType: 'USER_SESSIONS',
    resourceId: params.targetUserId,
    newState: { revokedSessions: res.changes }
  });

  return { success: true, revokedCount: res.changes };
}

/**
 * Cancels a pending invitation.
 */
export function cancelAdminInvitation(params: {
  invitationId: string;
  actorUserId: string;
  actorUserEmail: string;
}): { success: boolean; error?: string } {
  ensureDatabaseReady();
  const db = getDatabase();

  const inv = db.prepare('SELECT id, email, role FROM admin_invitations WHERE id = ?').get(params.invitationId) as any;
  if (!inv) {
    return { success: false, error: 'Invitation not found.' };
  }

  db.prepare('DELETE FROM admin_invitations WHERE id = ?').run(params.invitationId);

  recordAuditLog({
    userId: params.actorUserId,
    userEmail: params.actorUserEmail,
    action: 'ADMIN_INVITATION_CANCELLED',
    resourceType: 'ADMIN_INVITATION',
    resourceId: params.invitationId,
    previousState: { email: inv.email, role: inv.role }
  });

  return { success: true };
}
