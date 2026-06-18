import { swaggerUI } from '@hono/swagger-ui';
import { correlationIdMiddleware, createLogger, jsonError, requestLoggerMiddleware } from '@okaz/shared';
import { Hono } from 'hono';

import './hono-env.js';
import { ordersOpenApi } from './docs/orders.openapi.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { ordersRoutes } from './modules/orders/orders.routes.js';

const logger = createLogger('orders-service');

const ordersApp = new Hono();

ordersApp.use('*', correlationIdMiddleware());
ordersApp.use('*', requestLoggerMiddleware(logger));

ordersApp.route('/', healthRoutes);
ordersApp.get('/openapi.json', (c) => c.json(ordersOpenApi));
ordersApp.get('/docs', swaggerUI({ url: '/openapi.json' }));
ordersApp.route('/orders', ordersRoutes);

ordersApp.notFound((c) => jsonError(c, 404, 'Not Found', { code: 'NOT_FOUND' }));

ordersApp.onError((error, c) => {
  logger.error('unhandled_error', {
    message: error.message,
    requestId: c.get('requestId')
  });

  return jsonError(c, 500, 'Internal server error', { code: 'INTERNAL_ERROR' });
});

export { ordersApp };
