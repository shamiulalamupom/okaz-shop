import { Hono } from 'hono';

import { createAuthProxyController } from './auth-proxy.controller.js';

export const createAuthProxyRoutes = (authServiceUrl: string) => {
  const authProxyRoutes = new Hono();

  authProxyRoutes.all('/*', createAuthProxyController(authServiceUrl));

  return authProxyRoutes;
};
