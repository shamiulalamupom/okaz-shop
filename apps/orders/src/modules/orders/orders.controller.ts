import { parseJsonBody } from '@okaz/shared';
import type { Context } from 'hono';

import { ordersConfig } from '../../config/orders.config.js';
import { OrderError, ordersService } from './orders.service.js';
import { confirmPaymentSchema } from './orders.schemas.js';

const handleOrderError = (c: Context, error: unknown) => {
  if (error instanceof OrderError) {
    switch (error.code) {
      case 'CART_EMPTY':
        return c.json({ message: error.message }, 400);
      case 'PRODUCT_UNAVAILABLE':
      case 'INVALID_STATE':
        return c.json({ message: error.message }, 409);
      case 'ORDER_NOT_FOUND':
        return c.json({ message: error.message }, 404);
      case 'UPSTREAM_UNAVAILABLE':
        return c.json({ message: error.message }, 502);
    }
  }

  throw error;
};

export const checkoutController = async (c: Context) => {
  const user = c.get('user');

  try {
    const result = await ordersService.checkout(user.id);
    return c.json(result, 201);
  } catch (error) {
    return handleOrderError(c, error);
  }
};

export const listOrdersController = async (c: Context) => {
  const user = c.get('user');
  return c.json({ orders: await ordersService.listOrders(user.id) });
};

export const getOrderController = async (c: Context) => {
  const user = c.get('user');
  const orderId = c.req.param('id');

  if (!orderId) {
    return c.json({ message: 'order id is required' }, 400);
  }

  try {
    return c.json(await ordersService.getOrder(user.id, orderId));
  } catch (error) {
    return handleOrderError(c, error);
  }
};

export const confirmPaymentController = async (c: Context) => {
  // Mock-only stand-in for the provider webhook; absent in real provider modes.
  if (ordersConfig.paymentProvider !== 'mock') {
    return c.json({ message: 'Not Found' }, 404);
  }

  const user = c.get('user');
  const orderId = c.req.param('id');

  if (!orderId) {
    return c.json({ message: 'order id is required' }, 400);
  }

  const parsed = await parseJsonBody(c, confirmPaymentSchema, { maxBytes: ordersConfig.requestMaxBytes });
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    return c.json(await ordersService.confirmPayment(user.id, orderId, parsed.data.outcome));
  } catch (error) {
    return handleOrderError(c, error);
  }
};
