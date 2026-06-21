import { Hono } from 'hono';

import { notificationsConfig } from '../../config/notifications.config.js';
import { internalSecretMiddleware } from '../../middleware/internal-secret.middleware.js';
import { ingestEventController } from '../notifications/notifications.controller.js';

/**
 * Internal event ingestion. The orders service POSTs order lifecycle events here;
 * the notifications service decides who to notify and persists the rows.
 */
const internalRoutes = new Hono();

internalRoutes.use('*', internalSecretMiddleware(notificationsConfig.internalServiceSecret));
internalRoutes.post('/events', ingestEventController);

export { internalRoutes };
