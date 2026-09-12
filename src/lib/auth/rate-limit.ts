// Lightweight in-memory rate limiter for authentication & security endpoints

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (record.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks and increments rate limit counter for a given key.
 * @param key Unique key (e.g. `admin_login:${ip}`)
 * @param maxAttempts Maximum allowed attempts in window
 * @param windowMs Time window in milliseconds (default 15 minutes)
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || record.resetAt <= now) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt: now + windowMs
    };
  }

  if (record.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    resetAt: record.resetAt
  };
}

/**
 * Resets rate limit for a key upon successful verification.
 */
export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}
