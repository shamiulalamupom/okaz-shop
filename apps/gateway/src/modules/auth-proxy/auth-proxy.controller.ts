import type { Context } from 'hono';
import { createAuthProxyService } from './auth-proxy.service.js';

export const createAuthProxyController = (authServiceUrl: string) => {
  const authProxyService = createAuthProxyService(authServiceUrl);

  return async (c: Context) => {
    return authProxyService.proxyRequest(c);
  };
};
