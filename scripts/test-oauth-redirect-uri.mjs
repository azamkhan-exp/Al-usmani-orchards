// Unit verification of getGoogleOAuthRedirectUri
import { getGoogleOAuthRedirectUri } from '../src/lib/auth/google-oauth.ts';

console.log('=== VERIFYING GOOGLE OAUTH REDIRECT URI RESOLUTION ===\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function createMockRequest({ host = 'localhost:3000', forwardedProto, forwardedHost, pathname = '/api/auth/google' } = {}) {
  const headers = new Map();
  if (host) headers.set('host', host);
  if (forwardedProto) headers.set('x-forwarded-proto', forwardedProto);
  if (forwardedHost) headers.set('x-forwarded-host', forwardedHost);

  return {
    headers: {
      get: (k) => headers.get(k.toLowerCase()) || null,
    },
    nextUrl: {
      pathname,
    },
  };
}

// Case 1: Standard local development with NEXT_PUBLIC_APP_URL=http://localhost:3000
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
delete process.env.GOOGLE_REDIRECT_URI;
let uri = getGoogleOAuthRedirectUri(createMockRequest());
assert(uri === 'http://localhost:3000/api/auth/google/callback', `Localhost dev resolves to exact URI: ${uri}`);

// Case 2: Trailing slash in NEXT_PUBLIC_APP_URL=http://localhost:3000/
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000/';
uri = getGoogleOAuthRedirectUri(createMockRequest());
assert(uri === 'http://localhost:3000/api/auth/google/callback', `Trailing slash in APP_URL is safely stripped: ${uri}`);

// Case 3: Production domain with NEXT_PUBLIC_APP_URL=https://alusmaniorchards.pk
process.env.NEXT_PUBLIC_APP_URL = 'https://alusmaniorchards.pk';
uri = getGoogleOAuthRedirectUri(createMockRequest());
assert(uri === 'https://alusmaniorchards.pk/api/auth/google/callback', `Production resolves to exact URI: ${uri}`);

// Case 4: Dynamic request without env vars on localhost:3000
delete process.env.NEXT_PUBLIC_APP_URL;
delete process.env.APP_URL;
uri = getGoogleOAuthRedirectUri(createMockRequest({ host: 'localhost:3000' }));
assert(uri === 'http://localhost:3000/api/auth/google/callback', `Header host localhost:3000 resolves correctly to: ${uri}`);

// Case 5: 127.0.0.1:3000 normalized to localhost:3000 with http protocol
uri = getGoogleOAuthRedirectUri(createMockRequest({ host: '127.0.0.1:3000' }));
assert(uri === 'http://localhost:3000/api/auth/google/callback', `127.0.0.1 normalized to localhost with http protocol: ${uri}`);

// Case 6: Reverse proxy with x-forwarded-proto and x-forwarded-host
uri = getGoogleOAuthRedirectUri(createMockRequest({
  host: 'internal-ip:8080',
  forwardedProto: 'https',
  forwardedHost: 'alusmaniorchards.pk'
}));
assert(uri === 'https://alusmaniorchards.pk/api/auth/google/callback', `Reverse proxy headers resolve correctly: ${uri}`);

// Case 7: NextAuth alias path (/api/auth/callback/google)
uri = getGoogleOAuthRedirectUri(createMockRequest({
  host: 'localhost:3000',
  pathname: '/api/auth/callback/google'
}));
assert(uri === 'http://localhost:3000/api/auth/callback/google', `NextAuth alias path resolves correctly: ${uri}`);

// Case 8: Explicit GOOGLE_REDIRECT_URI override
process.env.GOOGLE_REDIRECT_URI = 'https://custom.alusmaniorchards.pk/oauth/callback';
uri = getGoogleOAuthRedirectUri(createMockRequest());
assert(uri === 'https://custom.alusmaniorchards.pk/oauth/callback', `Explicit GOOGLE_REDIRECT_URI override is honored: ${uri}`);

console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
if (failed > 0) process.exit(1);
