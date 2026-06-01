import type { Context } from 'hono';
import { demoService } from './demo.service.js';

export const protectedController = (c: Context) => {
  return c.json(demoService.buildProtectedResponse(c.get('user')));
};

export const adminController = (c: Context) => {
  return c.json(demoService.buildAdminResponse(c.get('user')));
};
