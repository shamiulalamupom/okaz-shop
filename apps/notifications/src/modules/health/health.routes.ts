import { Hono } from 'hono';

import { liveController, readyController } from './health.controller.js';

const healthRoutes = new Hono();

healthRoutes.get('/live', liveController);
healthRoutes.get('/ready', readyController);

export { healthRoutes };
