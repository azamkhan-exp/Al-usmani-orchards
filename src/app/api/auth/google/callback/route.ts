import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatabase, runTransaction } from '@/lib/db';
import { ensureDatabaseReady } from '@/lib/db/init';
import { createSession, isOwnerEmail } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/crypto';
import { getGoogleOAuthRedirectUri } from '@/lib/auth/google-oauth';
import crypto from 'node:crypto';

export async function GET(req: NextRequest) {
  try {
    ensureDatabaseReady();
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    const cookieStore = await cookies();
    const storedState = cookieStore.get('google_oauth_state')?.value;
    cookieStore.delete('google_oauth_state');

    // Strict CSRF Protection
    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(new URL('/login?error=Invalid+OAuth+State', req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=Missing+Authorization+Code', req.url));
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/login?error=Google+OAuth+credentials+are+not+configured+on+the+server', req.url)
      );
    }

    const redirectUri = getGoogleOAuthRedirectUri(req);
    console.log(`[AUTH] Exchanging code for token with redirect_uri=${redirectUri}`);

    // 1. Exchange authorization code for token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return NextResponse.redirect(new URL('/login?error=Google+Token+Exchange+Failed', req.url));
    }

    // 2. Fetch authenticated profile from Google OpenID UserInfo endpoint
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    if (!userData.email || !userData.sub) {
      return NextResponse.redirect(new URL('/login?error=Incomplete+Google+Profile+Data', req.url));
    }

    if (userData.email_verified === false) {
      return NextResponse.redirect(new URL('/login?error=Google+Email+Must+Be+Verified', req.url));
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    const googleSub = userData.sub;
    const name = userData.name || userData.given_name || 'Valued Patron';
    const avatarUrl = userData.picture || null;
    const isOwner = isOwnerEmail(cleanEmail);

    const db = getDatabase();

    // 3. Check for existing OAuth link in accounts table
    let account = db.prepare(`
      SELECT user_id FROM accounts WHERE provider = 'google' AND provider_account_id = ?
    `).get(googleSub) as any;

    let user: any = null;

    if (account) {
      user = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(account.user_id) as any;
      if (user && isOwner && user.role !== 'SUPER_ADMIN') {
        db.prepare(`UPDATE users SET role = 'SUPER_ADMIN', updated_at = datetime('now') WHERE id = ?`).run(user.id);
        user.role = 'SUPER_ADMIN';
      }
    }

    // 4. If account not linked, check if user exists by verified email
    if (!user) {
      const existingUser = db.prepare('SELECT id, name, email, role, status FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;

      if (existingUser) {
        user = existingUser;
        if (isOwner && user.role !== 'SUPER_ADMIN') {
          db.prepare(`UPDATE users SET role = 'SUPER_ADMIN', updated_at = datetime('now') WHERE id = ?`).run(user.id);
          user.role = 'SUPER_ADMIN';
        }

        // Link this Google provider account
        const accountId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO accounts (id, user_id, provider, provider_account_id, access_token, refresh_token, token_type, scope, id_token, created_at)
          VALUES (?, ?, 'google', ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          accountId,
          user.id,
          googleSub,
          tokenData.access_token || null,
          tokenData.refresh_token || null,
          tokenData.token_type || null,
          tokenData.scope || null,
          tokenData.id_token || null
        );

        // Update user avatar & verified status
        db.prepare(`
          UPDATE users SET avatar_url = COALESCE(?, avatar_url), email_verified = 1, updated_at = datetime('now') WHERE id = ?
        `).run(avatarUrl, user.id);
      } else {
        // 5. Create new user, account link, and customer profile
        const userId = crypto.randomUUID();
        const accountId = crypto.randomUUID();
        const customerId = crypto.randomUUID();
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = hashPassword(randomPassword);
        const role = isOwner ? 'SUPER_ADMIN' : 'CUSTOMER';
        const referralCode = `AUO-${Math.floor(1000 + Math.random() * 9000)}`;

        runTransaction((database) => {
          database.prepare(`
            INSERT INTO users (id, name, email, password_hash, role, phone, avatar_url, email_verified, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, null, ?, 1, 'ACTIVE', datetime('now'), datetime('now'))
          `).run(userId, name, cleanEmail, passwordHash, role, avatarUrl);

          database.prepare(`
            INSERT INTO accounts (id, user_id, provider, provider_account_id, access_token, refresh_token, token_type, scope, id_token, created_at)
            VALUES (?, ?, 'google', ?, ?, ?, ?, ?, ?, datetime('now'))
          `).run(
            accountId,
            userId,
            googleSub,
            tokenData.access_token || null,
            tokenData.refresh_token || null,
            tokenData.token_type || null,
            tokenData.scope || null,
            tokenData.id_token || null
          );

          const existingCust = database.prepare('SELECT id, user_id FROM customers WHERE LOWER(email) = ?').get(cleanEmail) as any;
          if (existingCust) {
            database.prepare('UPDATE customers SET user_id = ? WHERE id = ?').run(userId, existingCust.id);
          } else {
            database.prepare(`
              INSERT INTO customers (id, user_id, full_name, email, phone, city, segment, total_spent, orders_count, referral_code, created_at)
              VALUES (?, ?, ?, ?, null, 'Lahore', 'NEW', 0, 0, ?, datetime('now'))
            `).run(customerId, userId, name, cleanEmail, referralCode);
          }
        });

        user = { id: userId, name, email: cleanEmail, role, status: 'ACTIVE' };
      }
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.redirect(new URL('/login?error=Account+Suspended', req.url));
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'GoogleOAuth';
    await createSession(user.id, ip, userAgent);

    // Redirect all admin roles to command center, customers to patron account
    const adminRoles = [
      'SUPER_ADMIN',
      'ADMIN',
      'FINANCE_MANAGER',
      'INVENTORY_MANAGER',
      'ORDER_MANAGER',
      'MARKETING_MANAGER',
      'SUPPORT_AGENT'
    ];
    const destination = adminRoles.includes(user.role) ? '/admin' : '/account';
    return NextResponse.redirect(new URL(destination, req.url));
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=OAuth+Authentication+Failed', req.url));
  }
}
