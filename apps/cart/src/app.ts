import { correlationIdMiddleware, createLogger, jsonError, requestLoggerMiddleware } from '@okaz/shared';
import { Hono } from 'hono';

import './hono-env.js';
import { cartRoutes } from './modules/cart/cart.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';

const logger = createLogger('cart-service');

const cartApp = new Hono();

cartApp.use('*', correlationIdMiddleware());
cartApp.use('*', requestLoggerMiddleware(logger));

cartApp.route('/', healthRoutes);
cartApp.route('/cart', cartRoutes);

cartApp.notFound((c) => jsonError(c, 404, 'Not Found', { code: 'NOT_FOUND' }));

cartApp.onError((error, c) => {
  logger.error('unhandled_error', {
    message: error.message,
    requestId: c.get('requestId')
  });

  return jsonError(c, 500, 'Internal server error', { code: 'INTERNAL_ERROR' });
});

export { cartApp };
