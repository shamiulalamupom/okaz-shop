import { Hono } from 'hono';

import { createCartProxyController } from './cart-proxy.controller.js';
import { authMiddleware } from '../../middleware/jwt-auth.middleware.js';

type JwtConfig = { audience: string; issuer: string; secret: string };

export const createCartProxyRoutes = (cartServiceUrl: string, jwtConfig: JwtConfig) => {
  const cartProxyRoutes = new Hono();

  // Every cart route requires a valid JWT; the proxy then injects the verified
  // identity as trusted X-User-* headers for the cart service.
  cartProxyRoutes.use('*', authMiddleware(jwtConfig));
  cartProxyRoutes.all('/*', createCartProxyController(cartServiceUrl));

  return cartProxyRoutes;
};
