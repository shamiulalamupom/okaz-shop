import type { MiddlewareHandler } from 'hono';
import { verifyAccessToken } from '@okaz/shared';
import { z } from 'zod';

type JwtConfig = {
  audience: string;
  issuer: string;
  secret: string;
};

const bearerHeaderSchema = z.string().regex(/^Bearer\s+.+$/);

export const jwtAuthMiddleware = (jwtConfig: JwtConfig): MiddlewareHandler => {
  return async (c, next) => {
    const parsedAuthHeader = bearerHeaderSchema.safeParse(c.req.header('authorization'));
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
