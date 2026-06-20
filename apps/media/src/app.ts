import { swaggerUI } from '@hono/swagger-ui';
import { correlationIdMiddleware, createLogger, jsonError, requestLoggerMiddleware } from '@okaz/shared';
import { Hono } from 'hono';

import './hono-env.js';
import { mediaOpenApi } from './docs/media.openapi.js';
import { objectStore } from './lib/store.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { mediaRoutes } from './modules/media/media.routes.js';

const logger = createLogger('media-service');

if (!objectStore.configured) {
  logger.warn('object_store_not_configured', {
    message: 'R2 credentials are not set; uploads use a placeholder store. Set R2_* env vars for real uploads.'
  });
}

const mediaApp = new Hono();

mediaApp.use('*', correlationIdMiddleware());
mediaApp.use('*', requestLoggerMiddleware(logger));

mediaApp.route('/', healthRoutes);
mediaApp.get('/openapi.json', (c) => c.json(mediaOpenApi));
mediaApp.get('/docs', swaggerUI({ url: '/openapi.json' }));
mediaApp.route('/media', mediaRoutes);

mediaApp.notFound((c) => jsonError(c, 404, 'Not Found', { code: 'NOT_FOUND' }));

mediaApp.onError((error, c) => {
  logger.error('unhandled_error', {
    message: error.message,
    requestId: c.get('requestId')
  });

  return jsonError(c, 500, 'Internal server error', { code: 'INTERNAL_ERROR' });
});

export { mediaApp };
