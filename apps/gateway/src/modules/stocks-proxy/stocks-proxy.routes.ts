import { Hono } from 'hono';

import { createServiceProxy } from '../../lib/http-proxy.js';
import { authMiddleware, requireRoles } from '../../middleware/jwt-auth.middleware.js';

type JwtConfig = { audience: string; issuer: string; secret: string };

/**
 * Proxies stock/store routes to the stocks service.
 * - Reads require an authenticated user (viewing stock levels is a member feature).
 * - Writes are restricted to STORE_MANAGER / ADMIN roles.
 * The stocks service's /internal/* routes are never mounted here, so they stay private.
 */
export const createStocksProxyRoutes = (stocksServiceUrl: string, jwtConfig: JwtConfig) => {
  const routes = new Hono();
  const proxy = createServiceProxy(stocksServiceUrl);

  routes.get('/*', authMiddleware(jwtConfig), proxy);

  const managerOnly = [authMiddleware(jwtConfig), requireRoles(['STORE_MANAGER', 'ADMIN'])] as const;
  routes.post('/*', ...managerOnly, proxy);
  routes.put('/*', ...managerOnly, proxy);
  routes.delete('/*', ...managerOnly, proxy);

  return routes;
};
