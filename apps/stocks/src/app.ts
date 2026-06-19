import { swaggerUI } from '@hono/swagger-ui';
import { correlationIdMiddleware, createLogger, jsonError, requestLoggerMiddleware } from '@okaz/shared';
import { Hono } from 'hono';

import './hono-env.js';
import { stocksOpenApi } from './docs/stocks.openapi.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { internalRoutes } from './modules/internal/internal.routes.js';
import { stocksRoutes } from './modules/stocks/stocks.routes.js';
import { storesRoutes } from './modules/stores/stores.routes.js';

const logger = createLogger('stocks-service');

const stocksApp = new Hono();

stocksApp.use('*', correlationIdMiddleware());
stocksApp.use('*', requestLoggerMiddleware(logger));

stocksApp.route('/', healthRoutes);
stocksApp.get('/openapi.json', (c) => c.json(stocksOpenApi));
stocksApp.get('/docs', swaggerUI({ url: '/openapi.json' }));
stocksApp.route('/stores', storesRoutes);
stocksApp.route('/stocks', stocksRoutes);
stocksApp.route('/internal', internalRoutes);

stocksApp.notFound((c) => jsonError(c, 404, 'Not Found', { code: 'NOT_FOUND' }));

stocksApp.onError((error, c) => {
  logger.error('unhandled_error', {
    message: error.message,
    requestId: c.get('requestId')
  });

  return jsonError(c, 500, 'Internal server error', { code: 'INTERNAL_ERROR' });
});

export { stocksApp };
