import { Hono } from 'hono';

import { createServiceProxy } from '../../lib/http-proxy.js';
import { authMiddleware } from '../../middleware/jwt-auth.middleware.js';

type JwtConfig = { audience: string; issuer: string; secret: string };

/**
 * Proxies order routes to the orders service. Every order route requires an
 * authenticated user; the orders service additionally enforces ownership.
 */
export const createOrdersProxyRoutes = (ordersServiceUrl: string, jwtConfig: JwtConfig) => {
  const routes = new Hono();
  const proxy = createServiceProxy(ordersServiceUrl);

  routes.use('/*', authMiddleware(jwtConfig));
  routes.all('/*', proxy);

  return routes;
};
