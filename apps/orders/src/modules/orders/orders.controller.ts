import { parseJsonBody } from '@okaz/shared';
import type { Context } from 'hono';

import { ordersConfig } from '../../config/orders.config.js';
import { createOrderSchema } from './orders.schemas.js';
import { ProductNotFoundError, ordersService } from './orders.service.js';

/** Store managers and admins may manage every customer's orders. */
const canManageOrders = (c: Context) => {
  const roles = c.get('user').roles;
  return roles.includes('STORE_MANAGER') || roles.includes('ADMIN');
};

export const listOrdersController = async (c: Context) => {
  const user = c.get('user');
  const orders = await ordersService.listForUser(user.id);
  return c.json({ data: orders }, 200);
};

export const getOrderController = async (c: Context) => {
  const user = c.get('user');
  const order = await ordersService.getForUser(c.req.param('id')!, user.id, canManageOrders(c));

  if (!order) {
    return c.json({ message: 'Order not found' }, 404);
  }

  return c.json(order, 200);
};

export const createOrderController = async (c: Context) => {
  const user = c.get('user');
  const requestId = c.get('requestId');

  const parsed = await parseJsonBody(c, createOrderSchema, {
    maxBytes: ordersConfig.requestMaxBytes
  });

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const order = await ordersService.create(user.id, user.email, parsed.data, requestId);
    const status = order.status === 'REJECTED' ? 409 : 201;
    return c.json(order, status);
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      return c.json({ message: error.message, code: 'PRODUCT_NOT_FOUND', productId: error.productId }, 400);
    }

    throw error;
  }
};

export const cancelOrderController = async (c: Context) => {
  const user = c.get('user');
  const requestId = c.get('requestId');

  const result = await ordersService.cancel(c.req.param('id')!, user.id, canManageOrders(c), requestId);

  if ('notFound' in result) {
    return c.json({ message: 'Order not found' }, 404);
  }

  if ('invalid' in result) {
    return c.json({ message: `Order cannot be cancelled (status ${result.order.status})` }, 409);
  }

  return c.json(result.order, 200);
};

// --- Order management (STORE_MANAGER / ADMIN) ---

export const listAllOrdersController = async (c: Context) => {
  if (!canManageOrders(c)) {
    return c.json({ message: 'Forbidden' }, 403);
  }

  const orders = await ordersService.listAll();
  return c.json({ data: orders }, 200);
};

export const validateOrderController = async (c: Context) => {
  if (!canManageOrders(c)) {
    return c.json({ message: 'Forbidden' }, 403);
  }

  const requestId = c.get('requestId');
  const result = await ordersService.validateByAdmin(c.req.param('id')!, requestId);

  if ('notFound' in result) {
    return c.json({ message: 'Order not found' }, 404);
  }
  if ('invalid' in result) {
    return c.json({ message: 'Order cannot be validated in its current state' }, 409);
  }
  if ('unavailable' in result) {
    return c.json({ message: 'Stock service unavailable; please retry' }, 503);
  }

  return c.json(result.order, 200);
};
