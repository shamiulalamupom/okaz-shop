import { Hono } from 'hono';

import { createReadyController, liveController } from './health.controller.js';

export const createHealthRoutes = (authServiceUrl: string) => {
  const healthRoutes = new Hono();

  healthRoutes.get('/live', liveController);
  healthRoutes.get('/ready', createReadyController(authServiceUrl));

  return healthRoutes;
};
