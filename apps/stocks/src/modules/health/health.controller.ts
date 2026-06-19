import type { Context } from 'hono';
import { healthService } from './health.service.js';

export const liveController = (c: Context) => {
  return c.json({ status: 'ok' }, 200);
};

export const readyController = async (c: Context) => {
  try {
    await healthService.checkReadiness();
    return c.json({ status: 'ok' }, 200);
  } catch {
    return c.json({ status: 'error' }, 503);
  }
};
