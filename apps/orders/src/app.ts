import { correlationIdMiddleware, createLogger, jsonError, requestLoggerMiddleware } from '@okaz/shared';
import { Hono } from 'hono';

import './hono-env.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { ordersRoutes } from './modules/orders/orders.routes.js';
import { paymentsRoutes } from './modules/payments/payments.routes.js';

const logger = createLogger('orders-service');

const ordersApp = new Hono();

ordersApp.use('*', correlationIdMiddleware());
ordersApp.use('*', requestLoggerMiddleware(logger));

ordersApp.route('/', healthRoutes);
ordersApp.route('/orders', ordersRoutes);
ordersApp.route('/payments', paymentsRoutes);

ordersApp.notFound((c) => jsonError(c, 404, 'Not Found', { code: 'NOT_FOUND' }));

ordersApp.onError((error, c) => {
  logger.error('unhandled_error', {
    message: error.message,
    requestId: c.get('requestId')
  });

  return jsonError(c, 500, 'Internal server error', { code: 'INTERNAL_ERROR' });
});

export { ordersApp };
