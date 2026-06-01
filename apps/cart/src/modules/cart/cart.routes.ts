import { Hono } from 'hono';

import { userContextMiddleware } from '../../middleware/user-context.middleware.js';
import {
  addItemController,
  clearCartController,
  getCartController,
  removeItemController,
  updateItemController
} from './cart.controller.js';

const cartRoutes = new Hono();

cartRoutes.use('*', userContextMiddleware());

cartRoutes.get('/', getCartController);
cartRoutes.post('/items', addItemController);
cartRoutes.patch('/items/:productId', updateItemController);
cartRoutes.delete('/items/:productId', removeItemController);
cartRoutes.delete('/', clearCartController);

export { cartRoutes };
