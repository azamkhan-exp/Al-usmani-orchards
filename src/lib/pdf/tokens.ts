import crypto from 'crypto';

/**
 * Derives the HMAC signing secret for order slip tokens.
 * Falls back through available env vars — never hardcoded in prod.
 */
function getSlipSecret(): string {
  return (
    process.env.ORDER_SLIP_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'auo-slip-fallback-secret-change-in-prod'
  );
}

/**
 * Builds the canonical message that is signed.
 * Any change to this format invalidates all outstanding tokens.
 */
function buildMessage(orderId: string, orderNumber: string, createdAt: string): string {
  return `slip:${orderId}:${orderNumber}:${createdAt}`;
}

/**
 * Generates a cryptographic HMAC-SHA256 token granting access to a specific
 * order's PDF consignment slip. The token is URL-safe base64-encoded.
 *
 * The token encodes no expiry — it is valid as long as the order record
 * exists and the server secret has not been rotated.
 */
export function generateOrderSlipToken(
  orderId: string,
  orderNumber: string,
  createdAt: string
): string {
  const message = buildMessage(orderId, orderNumber, createdAt);
  const hmac = crypto.createHmac('sha256', getSlipSecret());
  hmac.update(message);
  // URL-safe base64: replace +/ with -_ and strip padding
  return hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Verifies a slip token. Uses a constant-time comparison to prevent
 * timing side-channel attacks.
 *
 * @returns true if the token is valid and matches the order details.
 */
export function verifyOrderSlipToken(
  token: string,
  orderId: string,
  orderNumber: string,
  createdAt: string
): boolean {
  if (!token || !orderId || !orderNumber || !createdAt) return false;
  try {
    const expected = generateOrderSlipToken(orderId, orderNumber, createdAt);
    // Normalise both sides to Buffers of equal length for timingSafeEqual
    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(token, 'utf8');

    if (expectedBuf.length !== actualBuf.length) {
      // Lengths differ — still run a dummy comparison to avoid timing leak
      crypto.timingSafeEqual(expectedBuf, expectedBuf);
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
