import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { getGoogleOAuthRedirectUri } from '@/lib/auth/google-oauth';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getGoogleOAuthRedirectUri(req);
  console.log(`[AUTH] Initiating Google OAuth flow. redirect_uri=${redirectUri}`);

  const state = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/'
  });

  // Strict check for Google OAuth credentials in environment
  if (!clientId || clientId.trim() === '' || clientId.includes('your-google-client-id')) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'Google Sign-In is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.');
    return NextResponse.redirect(loginUrl);
  }

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(googleAuthUrl.toString());
}
