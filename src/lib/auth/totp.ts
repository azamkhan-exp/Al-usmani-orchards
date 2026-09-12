import crypto from 'node:crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer or byte array into a Base32 string (RFC 4648).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a Buffer (RFC 4648).
 */
export function base32Decode(str: string): Buffer {
  const cleaned = str.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      continue;
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a random cryptographic secret for TOTP (Base32 encoded).
 * Default 20 bytes = 160 bits entropy.
 */
export function generateTotpSecret(bytes = 20): string {
  const randomBytes = crypto.randomBytes(bytes);
  return base32Encode(randomBytes);
}

/**
 * Generates standard RFC 6238 otpauth URI for authenticator apps.
 */
export function generateTotpUri(
  email: string,
  secret: string,
  issuer = 'Al Usmani Orchards'
): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email.trim().toLowerCase())}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Computes a 6-digit TOTP code for a given timestamp and offset according to RFC 6238.
 */
export function generateTotpCode(
  secret: string,
  timeStepOffset = 0,
  timestampMs = Date.now()
): string {
  const key = base32Decode(secret);
  const timeStep = 30;
  const counter = Math.floor(timestampMs / 1000 / timeStep) + timeStepOffset;

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies a user-supplied 6-digit TOTP code with time drift window.
 * Default window = 1 allows -30s, current, and +30s.
 */
export function verifyTotpCode(
  secret: string,
  userCode: string,
  window = 1
): boolean {
  if (!secret || !userCode) return false;
  const cleanCode = userCode.trim().replace(/\s+/g, '');
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) return false;

  for (let offset = -window; offset <= window; offset++) {
    const validCode = generateTotpCode(secret, offset);
    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(validCode))) {
      return true;
    }
  }

  return false;
}

export interface HashedRecoveryCode {
  hash: string;
  used: boolean;
  used_at?: string;
}

/**
 * Generates single-use recovery codes, returning human-friendly plain codes and SHA-256 hashed objects.
 */
export function generateRecoveryCodes(count = 8): {
  plainCodes: string[];
  hashedCodes: HashedRecoveryCode[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: HashedRecoveryCode[] = [];

  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const code = `${part1}-${part2}`;
    plainCodes.push(code);

    const hash = crypto.createHash('sha256').update(code).digest('hex');
    hashedCodes.push({
      hash,
      used: false
    });
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verifies a single-use recovery code against stored hashed codes and burns it if valid.
 */
export function verifyAndConsumeRecoveryCode(
  inputCode: string,
  storedCodesJson: string | null | undefined
): { valid: boolean; updatedCodesJson: string } {
  if (!storedCodesJson || !inputCode) {
    return { valid: false, updatedCodesJson: storedCodesJson || '[]' };
  }

  try {
    const codes: HashedRecoveryCode[] = JSON.parse(storedCodesJson);
    const cleanInput = inputCode.trim().toUpperCase().replace(/\s+/g, '');
    const normalizedInput = cleanInput.includes('-') 
      ? cleanInput 
      : cleanInput.length === 8 
        ? `${cleanInput.slice(0, 4)}-${cleanInput.slice(4)}`
        : cleanInput;

    const inputHash = crypto.createHash('sha256').update(normalizedInput).digest('hex');

    const matchedIndex = codes.findIndex(c => !c.used && c.hash === inputHash);
    if (matchedIndex === -1) {
      return { valid: false, updatedCodesJson: JSON.stringify(codes) };
    }

    codes[matchedIndex].used = true;
    codes[matchedIndex].used_at = new Date().toISOString();

    return {
      valid: true,
      updatedCodesJson: JSON.stringify(codes)
    };
  } catch {
    return { valid: false, updatedCodesJson: storedCodesJson || '[]' };
  }
}

/**
 * Generates an SVG string representation of the QR code for embedding in UI.
 */
export async function generateTotpQrCodeSvg(uri: string): Promise<string> {
  return QRCode.toString(uri, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#113824',
      light: '#FFFFFF'
    }
  });
}

/**
 * Generates a Data URL (base64 image/png) of the QR code.
 */
export async function generateTotpQrCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    width: 280,
    margin: 2,
    color: {
      dark: '#113824',
      light: '#FFFFFF'
    }
  });
}
