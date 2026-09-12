// Edge & Node compatible Web Crypto HMAC signing and verification for Al Usmani Orchards sessions

const DEFAULT_SECRET = 'auo-production-grade-hmac-sha256-session-secret-salt-1934-multan';

export interface SessionPayload {
  userId: string;
  role: string;
  exp: number; // Unix timestamp in seconds
}

function base64UrlEncode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64url');
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64url').toString('utf8');
  }
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSessionToken(
  rawToken: string,
  payload: SessionPayload,
  secret = process.env.SESSION_SECRET || DEFAULT_SECRET
): Promise<string> {
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = base64UrlEncode(payloadStr);
  const dataToSign = `${rawToken}.${payloadBase64}`;

  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));

  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `${rawToken}.${payloadBase64}.${signatureHex}`;
}

export async function verifySignedSessionToken(
  tokenString: string,
  secret = process.env.SESSION_SECRET || DEFAULT_SECRET
): Promise<{ valid: boolean; rawToken?: string; payload?: SessionPayload }> {
  if (!tokenString) return { valid: false };

  const parts = tokenString.split('.');
  if (parts.length !== 3) {
    // Legacy fallback (token without HMAC format)
    return { valid: false, rawToken: tokenString };
  }

  const [rawToken, payloadBase64, signatureHex] = parts;
  const dataToSign = `${rawToken}.${payloadBase64}`;

  try {
    const key = await getHmacKey(secret);
    const enc = new TextEncoder();

    const matches = signatureHex.match(/.{1,2}/g);
    if (!matches) return { valid: false };
    const sigBytes = new Uint8Array(matches.map((byte) => parseInt(byte, 16)));

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(dataToSign));
    if (!isValid) return { valid: false };

    const payloadJson = base64UrlDecode(payloadBase64);
    const payload: SessionPayload = JSON.parse(payloadJson);

    // Verify expiration timestamp
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return { valid: false };
    }

    return { valid: true, rawToken, payload };
  } catch {
    return { valid: false };
  }
}

export async function signMfaChallengeToken(
  userId: string,
  expiresInSec = 300,
  secret = process.env.SESSION_SECRET || DEFAULT_SECRET
): Promise<string> {
  const nonce = crypto.randomUUID();
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const payloadStr = JSON.stringify({ userId, type: 'mfa_challenge', exp });
  const payloadBase64 = base64UrlEncode(payloadStr);
  const dataToSign = `${nonce}.${payloadBase64}`;

  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${nonce}.${payloadBase64}.${signatureHex}`;
}

export async function verifyMfaChallengeToken(
  tokenString: string,
  secret = process.env.SESSION_SECRET || DEFAULT_SECRET
): Promise<{ valid: boolean; userId?: string }> {
  if (!tokenString) return { valid: false };
  const parts = tokenString.split('.');
  if (parts.length !== 3) return { valid: false };

  const [nonce, payloadBase64, signatureHex] = parts;
  const dataToSign = `${nonce}.${payloadBase64}`;

  try {
    const key = await getHmacKey(secret);
    const enc = new TextEncoder();
    const matches = signatureHex.match(/.{1,2}/g);
    if (!matches) return { valid: false };
    const sigBytes = new Uint8Array(matches.map((b) => parseInt(b, 16)));

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(dataToSign));
    if (!isValid) return { valid: false };

    const payload = JSON.parse(base64UrlDecode(payloadBase64));
    if (payload.type !== 'mfa_challenge') return { valid: false };

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) return { valid: false };

    return { valid: true, userId: payload.userId };
  } catch {
    return { valid: false };
  }
}

export async function signPasswordResetToken(
  userId: string,
  expiresInSec = 900,
  secret = process.env.SESSION_SECRET || DEFAULT_SECRET
): Promise<string> {
  const nonce = crypto.randomUUID();
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const payloadStr = JSON.stringify({ userId, type: 'password_reset', exp });
  const payloadBase64 = base64UrlEncode(payloadStr);
  const dataToSign = `${nonce}.${payloadBase64}`;

  const key = await getHmacKey(secret);
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(dataToSign));
  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${nonce}.${payloadBase64}.${signatureHex}`;
}

export async function verifyPasswordResetToken(
  tokenString: string,
  secret = process.env.SESSION_SECRET || DEFAULT_SECRET
): Promise<{ valid: boolean; userId?: string }> {
  if (!tokenString) return { valid: false };
  const parts = tokenString.split('.');
  if (parts.length !== 3) return { valid: false };

  const [nonce, payloadBase64, signatureHex] = parts;
  const dataToSign = `${nonce}.${payloadBase64}`;

  try {
    const key = await getHmacKey(secret);
    const enc = new TextEncoder();
    const matches = signatureHex.match(/.{1,2}/g);
    if (!matches) return { valid: false };
    const sigBytes = new Uint8Array(matches.map((b) => parseInt(b, 16)));

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(dataToSign));
    if (!isValid) return { valid: false };

    const payload = JSON.parse(base64UrlDecode(payloadBase64));
    if (payload.type !== 'password_reset') return { valid: false };

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) return { valid: false };

    return { valid: true, userId: payload.userId };
  } catch {
    return { valid: false };
  }
}
