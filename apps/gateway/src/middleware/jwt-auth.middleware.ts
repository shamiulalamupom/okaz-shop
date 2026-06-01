import type { MiddlewareHandler } from 'hono';

import { verifyAccessToken, type UserRole } from '@okaz/shared';
import { z } from 'zod';

type JwtConfig = {
  audience: string;
  issuer: string;
  secret: string;
};

const bearerHeaderSchema = z.string().regex(/^Bearer\s+.+$/);

export const authMiddleware = (jwtConfig: JwtConfig): MiddlewareHandler => {
  return async (c, next) => {
    const authHeader = c.req.header('authorization');
    const parsedAuthHeader = bearerHeaderSchema.safeParse(authHeader);

    if (!parsedAuthHeader.success) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const token = parsedAuthHeader.data.slice('Bearer '.length).trim();

    try {
      const claims = await verifyAccessToken(token, jwtConfig);
      c.set('user', {
        id: claims.sub,
        email: claims.email,
        roles: claims.roles
      });
      await next();
    } catch {
      return c.json({ message: 'Unauthorized' }, 401);
    }
  };
};

export const requireRoles = (roles: UserRole[]): MiddlewareHandler => {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const hasRole = roles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      return c.json({ message: 'Forbidden' }, 403);
    }

    await next();
  };
};
