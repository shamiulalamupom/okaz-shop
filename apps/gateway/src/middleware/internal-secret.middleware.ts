import type { MiddlewareHandler } from 'hono';

/**
 * Guards internal service-to-service routes (e.g. event ingestion). Only other
 * microservices presenting the shared internal secret may call them; these routes
 * are not part of the public API surface.
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
