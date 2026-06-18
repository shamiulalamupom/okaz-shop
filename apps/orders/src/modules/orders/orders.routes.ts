import { Hono } from 'hono';

import { ordersConfig } from '../../config/orders.config.js';
import { jwtAuthMiddleware } from '../../middleware/jwt-auth.middleware.js';
import {
  cancelOrderController,
  createOrderController,
  getOrderController,
  listOrdersController
} from './orders.controller.js';

const ordersRoutes = new Hono();

// Every order route requires an authenticated user.
ordersRoutes.use('*', jwtAuthMiddleware(ordersConfig.jwt));

ordersRoutes.get('/', listOrdersController);
ordersRoutes.post('/', createOrderController);
ordersRoutes.get('/:id', getOrderController);
ordersRoutes.post('/:id/cancel', cancelOrderController);

export { ordersRoutes };
