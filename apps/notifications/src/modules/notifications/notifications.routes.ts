import { Hono } from 'hono';

import { notificationsConfig } from '../../config/notifications.config.js';
import { jwtAuthMiddleware } from '../../middleware/jwt-auth.middleware.js';
import {
  listNotificationsController,
  markAllReadController,
  markReadController,
  unreadCountController
} from './notifications.controller.js';

const notificationsRoutes = new Hono();

// Every notification route is scoped to the authenticated recipient.
notificationsRoutes.use('*', jwtAuthMiddleware(notificationsConfig.jwt));

notificationsRoutes.get('/', listNotificationsController);
// Register literal segments before the /:id param route.
notificationsRoutes.get('/unread-count', unreadCountController);
notificationsRoutes.post('/read-all', markAllReadController);
notificationsRoutes.post('/:id/read', markReadController);

export { notificationsRoutes };
