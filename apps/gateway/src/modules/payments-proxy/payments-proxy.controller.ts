import type { Context } from 'hono';

import { createPaymentsProxyService } from './payments-proxy.service.js';

export const createPaymentsProxyController = (ordersServiceUrl: string) => {
  const paymentsProxyService = createPaymentsProxyService(ordersServiceUrl);

  return async (c: Context) => {
    return paymentsProxyService.proxyRequest(c);
  };
};
