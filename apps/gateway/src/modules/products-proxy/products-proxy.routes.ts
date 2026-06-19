import { Hono } from 'hono';

import { createProductsProxyController } from './products-proxy.controller.js';
import { authMiddleware, requireRoles } from '../../middleware/jwt-auth.middleware.js';

type JwtConfig = { audience: string; issuer: string; secret: string };

export const createProductsProxyRoutes = (productsServiceUrl: string, jwtConfig: JwtConfig) => {
  const productsProxyRoutes = new Hono();
  const proxy = createProductsProxyController(productsServiceUrl);

  // Public reads
  productsProxyRoutes.get('/*', proxy);

  // Catalogue management is restricted to store managers / admins.
  const managerOnly = [authMiddleware(jwtConfig), requireRoles(['STORE_MANAGER', 'ADMIN'])] as const;
  productsProxyRoutes.post('/*', ...managerOnly, proxy);
  productsProxyRoutes.put('/*', ...managerOnly, proxy);
  productsProxyRoutes.delete('/*', ...managerOnly, proxy);

  return productsProxyRoutes;
};
