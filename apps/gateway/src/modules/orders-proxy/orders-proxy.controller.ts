import type { Context } from 'hono';

import { createOrdersProxyService } from './orders-proxy.service.js';

export const createOrdersProxyController = (ordersServiceUrl: string) => {
  const ordersProxyService = createOrdersProxyService(ordersServiceUrl);

  return async (c: Context) => {
    return ordersProxyService.proxyRequest(c);
  };
};
