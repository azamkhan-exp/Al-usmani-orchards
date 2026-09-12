import crypto from 'node:crypto';

// Strong cryptographic password hashing using scrypt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith('scrypt:')) {
    return false;
  }
  const [, salt, originalKey] = storedHash.split(':');
  if (!salt || !originalKey) {
    return false;
  }
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
  const originalBuffer = Buffer.from(originalKey, 'hex');

  if (keyBuffer.length !== originalBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(keyBuffer, originalBuffer);
}

// Generate high-entropy session token
export function generateSessionToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
