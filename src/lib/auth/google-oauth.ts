import type { NextRequest } from 'next/server';

export interface OAuthRequestLike {
  headers: Headers | { get(name: string): string | null };
  nextUrl?: { pathname: string };
  url?: string;
}

/**
 * Resolves the canonical Google OAuth redirect URI with complete consistency
 * across OAuth authorization initiation and code token exchange.
 *
 * Precedence:
 * 1. GOOGLE_REDIRECT_URI (explicit full callback URL, e.g. http://localhost:3000/api/auth/google/callback)
 * 2. NEXT_PUBLIC_APP_URL or APP_URL (canonical origin, e.g. http://localhost:3000 or https://alusmaniorchards.pk)
 * 3. Incoming HTTP request headers (with x-forwarded-proto/host and 127.0.0.1 normalization)
 */
export function getGoogleOAuthRedirectUri(req: NextRequest | OAuthRequestLike): string {
  // 1. Explicit callback URL override
  const explicitUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicitUri) {
    return explicitUri;
  }

  // Detect which path was requested (supports both /api/auth/google/callback and /api/auth/callback/google)
  const pathname = req.nextUrl?.pathname?.includes('/callback/google')
    ? '/api/auth/callback/google'
    : '/api/auth/google/callback';

  // 2. Base URL from environment
  const envBase = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)?.trim();
  if (envBase) {
    const base = envBase.replace(/\/+$/, '');
    return `${base}${pathname}`;
  }

  // 3. Request-derived host & protocol
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host');
  const host = forwardedHost || req.headers.get('host') || 'localhost:3000';

  // Normalize 127.0.0.1 to localhost for consistency with Google Cloud Console registered origins
  const normalizedHost = host.replace(/^127\.0\.0\.1(?=(:|$))/, 'localhost').replace(/\/+$/, '');

  let protocol = forwardedProto;
  if (!protocol) {
    const isLocal = normalizedHost.startsWith('localhost') || normalizedHost.startsWith('127.0.0.1');
    protocol = isLocal ? 'http' : 'https';
  }

  return `${protocol}://${normalizedHost}${pathname}`;
}
