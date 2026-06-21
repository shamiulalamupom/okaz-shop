import { Hono } from 'hono';

import { createServiceProxy } from '../../lib/http-proxy.js';
import { authMiddleware } from '../../middleware/jwt-auth.middleware.js';

type JwtConfig = { audience: string; issuer: string; secret: string };

/**
 * Proxies notification routes to the notifications service. Every route requires an
 * authenticated user; the notifications service scopes every query to that recipient.
 */
export const createNotificationsProxyRoutes = (notificationsServiceUrl: string, jwtConfig: JwtConfig) => {
  const routes = new Hono();
  const proxy = createServiceProxy(notificationsServiceUrl);

  routes.use('/*', authMiddleware(jwtConfig));
  routes.all('/*', proxy);

  return routes;
};
