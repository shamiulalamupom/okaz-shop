import type { MiddlewareHandler } from 'hono';

/**
 * Guards internal service-to-service routes. These are never exposed through the
 * gateway; only other microservices on the private network may call them, and
 * they must present the shared internal secret.
 */
export const internalSecretMiddleware = (expectedSecret: string): MiddlewareHandler => {
  return async (c, next) => {
    const provided = c.req.header('x-internal-secret');

    if (!provided || provided !== expectedSecret) {
      return c.json({ message: 'Forbidden' }, 403);
    }

    await next();
  };
};
