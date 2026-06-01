import type { UserRole } from '@okaz/shared';
import type { MiddlewareHandler } from 'hono';

/**
 * Trusts the identity headers injected by the gateway after it has verified the
 * JWT. The orders service is never exposed to the host directly, so only the
 * gateway (or trusted internal services) can set these.
 */
export const userContextMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const userId = c.req.header('x-user-id');

    if (!userId) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const roles = (c.req.header('x-user-roles') ?? '')
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean) as UserRole[];

    c.set('user', {
      id: userId,
      email: c.req.header('x-user-email') ?? '',
      roles
    });

    await next();
  };
};
