import type { MiddlewareHandler } from 'hono';

type Options = {
  max: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const getForwardedIp = (forwardedFor?: string) => {
  if (!forwardedFor) {
    return undefined;
  }

  return forwardedFor.split(',')[0]?.trim() || undefined;
};

export const createLoginRateLimitMiddleware = (options: Options): MiddlewareHandler => {
  return async (c, next) => {
    if (c.req.method !== 'POST') {
      await next();
      return;
    }

    const ip =
      getForwardedIp(c.req.header('x-forwarded-for')) ||
      c.req.header('x-real-ip') ||
      c.req.header('cf-connecting-ip') ||
      'unknown';

    const now = Date.now();
    const existing = buckets.get(ip);

    if (!existing || now > existing.resetAt) {
      buckets.set(ip, {
        count: 1,
        resetAt: now + options.windowMs
      });
      await next();
      return;
    }

    if (existing.count >= options.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      c.header('Retry-After', String(retryAfterSeconds));
      return c.json({ message: 'Too many login attempts. Please try again later.' }, 429);
    }

    existing.count += 1;
    buckets.set(ip, existing);
    await next();
  };
};
