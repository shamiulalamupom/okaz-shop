import { Hono } from 'hono';

import { createProductsProxyController } from './products-proxy.controller.js';
import { authMiddleware } from '../../middleware/jwt-auth.middleware.js';

type JwtConfig = { audience: string; issuer: string; secret: string };

export const createProductsProxyRoutes = (productsServiceUrl: string, jwtConfig: JwtConfig) => {
  const productsProxyRoutes = new Hono();
  const proxy = createProductsProxyController(productsServiceUrl);

  // Public reads
  productsProxyRoutes.get('/*', proxy);

  // Authenticated writes
  productsProxyRoutes.post('/*', authMiddleware(jwtConfig), proxy);
  productsProxyRoutes.put('/*', authMiddleware(jwtConfig), proxy);
  productsProxyRoutes.delete('/*', authMiddleware(jwtConfig), proxy);

  return productsProxyRoutes;
};
