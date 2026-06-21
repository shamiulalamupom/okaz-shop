import { swaggerUI } from '@hono/swagger-ui';
import { correlationIdMiddleware, createLogger, jsonError, requestLoggerMiddleware } from '@okaz/shared';
import { Hono } from 'hono';

import './hono-env.js';
import { notificationsOpenApi } from './docs/notifications.openapi.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { internalRoutes } from './modules/internal/internal.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';

const logger = createLogger('notifications-service');

const notificationsApp = new Hono();

notificationsApp.use('*', correlationIdMiddleware());
notificationsApp.use('*', requestLoggerMiddleware(logger));

notificationsApp.route('/', healthRoutes);
notificationsApp.get('/openapi.json', (c) => c.json(notificationsOpenApi));
notificationsApp.get('/docs', swaggerUI({ url: '/openapi.json' }));
notificationsApp.route('/notifications', notificationsRoutes);
notificationsApp.route('/internal', internalRoutes);

notificationsApp.notFound((c) => jsonError(c, 404, 'Not Found', { code: 'NOT_FOUND' }));

notificationsApp.onError((error, c) => {
  logger.error('unhandled_error', {
    message: error.message,
    requestId: c.get('requestId')
  });

  return jsonError(c, 500, 'Internal server error', { code: 'INTERNAL_ERROR' });
});

export { notificationsApp };
