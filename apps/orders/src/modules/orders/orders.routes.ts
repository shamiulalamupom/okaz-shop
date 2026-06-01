import { Hono } from 'hono';

import { userContextMiddleware } from '../../middleware/user-context.middleware.js';
import {
  checkoutController,
  confirmPaymentController,
  getOrderController,
  listOrdersController
} from './orders.controller.js';

const ordersRoutes = new Hono();

ordersRoutes.use('*', userContextMiddleware());

ordersRoutes.post('/checkout', checkoutController);
ordersRoutes.get('/', listOrdersController);
ordersRoutes.get('/:id', getOrderController);
ordersRoutes.post('/:id/payment/mock-confirm', confirmPaymentController);

export { ordersRoutes };
