import { Hono } from 'hono';

import { createServiceProxy } from '../../lib/http-proxy.js';
import { authMiddleware } from '../../middleware/jwt-auth.middleware.js';

type JwtConfig = { audience: string; issuer: string; secret: string };

/**
 * Proxies media routes to the media service. Every route requires an authenticated
 * user; the media service additionally enforces per-purpose role checks and ownership.
 * Note: file bytes go directly from the browser to R2, not through the gateway.
 */
export const createMediaProxyRoutes = (mediaServiceUrl: string, jwtConfig: JwtConfig) => {
  const routes = new Hono();
  const proxy = createServiceProxy(mediaServiceUrl);

  routes.use('/*', authMiddleware(jwtConfig));
  routes.all('/*', proxy);

  return routes;
};
