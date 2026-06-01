import { Hono } from 'hono';

import { createOrdersProxyController } from './orders-proxy.controller.js';
import { authMiddleware } from '../../middleware/jwt-auth.middleware.js';

type JwtConfig = { audience: string; issuer: string; secret: string };

export const createOrdersProxyRoutes = (ordersServiceUrl: string, jwtConfig: JwtConfig) => {
  const ordersProxyRoutes = new Hono();

  // Every orders route requires a valid JWT; the proxy then injects the
  // verified identity as trusted X-User-* headers for the orders service.
  ordersProxyRoutes.use('*', authMiddleware(jwtConfig));
  ordersProxyRoutes.all('/*', createOrdersProxyController(ordersServiceUrl));

  return ordersProxyRoutes;
};
