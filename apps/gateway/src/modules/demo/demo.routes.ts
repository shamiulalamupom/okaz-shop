import { Hono } from 'hono';

import { adminController, protectedController } from './demo.controller.js';
import { authMiddleware, requireRoles } from '../../middleware/jwt-auth.middleware.js';

export const createDemoRoutes = (jwtConfig: { audience: string; issuer: string; secret: string }) => {
  const demoRoutes = new Hono();

  demoRoutes.get('/protected', authMiddleware(jwtConfig), protectedController);
  demoRoutes.get('/admin', authMiddleware(jwtConfig), requireRoles(['ADMIN']), adminController);

  return demoRoutes;
};
