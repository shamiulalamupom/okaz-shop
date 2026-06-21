import { Hono } from 'hono';

import { ordersConfig } from '../../config/orders.config.js';
import { jwtAuthMiddleware } from '../../middleware/jwt-auth.middleware.js';
import {
  cancelOrderController,
  createOrderController,
  deliverOrderController,
  getOrderController,
  listAllOrdersController,
  listOrdersController,
  validateOrderController
} from './orders.controller.js';

const ordersRoutes = new Hono();

// Every order route requires an authenticated user.
ordersRoutes.use('*', jwtAuthMiddleware(ordersConfig.jwt));

ordersRoutes.get('/', listOrdersController);
ordersRoutes.post('/', createOrderController);
// Admin: register the literal /admin before the /:id param route.
ordersRoutes.get('/admin', listAllOrdersController);
ordersRoutes.get('/:id', getOrderController);
ordersRoutes.post('/:id/cancel', cancelOrderController);
ordersRoutes.post('/:id/validate', validateOrderController);
ordersRoutes.post('/:id/deliver', deliverOrderController);

export { ordersRoutes };
