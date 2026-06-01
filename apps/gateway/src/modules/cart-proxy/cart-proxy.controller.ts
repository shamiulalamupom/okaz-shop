import type { Context } from 'hono';

import { createCartProxyService } from './cart-proxy.service.js';

export const createCartProxyController = (cartServiceUrl: string) => {
  const cartProxyService = createCartProxyService(cartServiceUrl);

  return async (c: Context) => {
    return cartProxyService.proxyRequest(c);
  };
};
