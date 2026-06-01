import { Hono } from 'hono';

import { createPaymentsProxyController } from './payments-proxy.controller.js';

export const createPaymentsProxyRoutes = (ordersServiceUrl: string) => {
  const paymentsProxyRoutes = new Hono();

  // Public — no auth middleware. The webhook is authenticated by Stripe signature.
  paymentsProxyRoutes.all('/*', createPaymentsProxyController(ordersServiceUrl));

  return paymentsProxyRoutes;
};
