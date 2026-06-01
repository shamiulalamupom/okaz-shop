import type { Context } from 'hono';
import { createProductsProxyService } from './products-proxy.service.js';

export const createProductsProxyController = (productsServiceUrl: string) => {
  const productsProxyService = createProductsProxyService(productsServiceUrl);

  return async (c: Context) => {
    return productsProxyService.proxyRequest(c);
  };
};
