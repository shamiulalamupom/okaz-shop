// ../apps/auth/src/modules/auth/auth.routes.ts

import { Hono } from 'hono';

import { authConfig } from '../../config/auth.config.js';
import { jwtAuthMiddleware } from '../../middleware/jwt-auth.middleware.js';
import {
  loginController,
  meController,
  registerController,
  updateMeController
} from './auth.controller.js';

const authRoutes = new Hono();

authRoutes.post('/register', registerController);
authRoutes.post('/login', loginController);
authRoutes.get('/me', jwtAuthMiddleware(authConfig.jwt), meController);
authRoutes.patch('/me', jwtAuthMiddleware(authConfig.jwt), updateMeController);

export { authRoutes };
