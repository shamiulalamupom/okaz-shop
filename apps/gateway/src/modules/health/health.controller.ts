import type { Context } from 'hono';
import { createHealthService } from './health.service.js';

export const liveController = (c: Context) => {
  return c.json({ status: 'ok' }, 200);
};

export const createReadyController = (authServiceUrl: string) => {
  const healthService = createHealthService(authServiceUrl);

  return async (c: Context) => {
    try {
      const isReady = await healthService.isReady(c);
      if (!isReady) {
        return c.json({ status: 'error' }, 503);
      }

      return c.json({ status: 'ok' }, 200);
    } catch {
      return c.json({ status: 'error' }, 503);
    }
  };
};
