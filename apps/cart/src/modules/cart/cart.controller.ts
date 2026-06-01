import { parseJsonBody } from '@okaz/shared';
import type { Context } from 'hono';

import { cartConfig } from '../../config/cart.config.js';
import { CartError, cartService } from './cart.service.js';
import { addItemSchema, updateItemSchema } from './cart.schemas.js';

const handleCartError = (c: Context, error: unknown) => {
  if (error instanceof CartError) {
    if (error.code === 'PRODUCTS_SERVICE_UNAVAILABLE') {
      return c.json({ message: 'Products service unavailable' }, 502);
    }

    return c.json({ message: error.message }, 404);
  }

  throw error;
};

export const getCartController = async (c: Context) => {
  const user = c.get('user');
  return c.json(await cartService.getCart(user.id));
};

export const addItemController = async (c: Context) => {
  const user = c.get('user');
  const parsed = await parseJsonBody(c, addItemSchema, { maxBytes: cartConfig.requestMaxBytes });

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const cart = await cartService.addItem(user.id, parsed.data.productId, parsed.data.quantity);
    return c.json(cart, 201);
  } catch (error) {
    return handleCartError(c, error);
  }
};

export const updateItemController = async (c: Context) => {
  const user = c.get('user');
  const productId = c.req.param('productId');

  if (!productId) {
    return c.json({ message: 'productId is required' }, 400);
  }

  const parsed = await parseJsonBody(c, updateItemSchema, { maxBytes: cartConfig.requestMaxBytes });

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const cart = await cartService.updateItem(user.id, productId, parsed.data.quantity);
    return c.json(cart);
  } catch (error) {
    return handleCartError(c, error);
  }
};

export const removeItemController = async (c: Context) => {
  const user = c.get('user');
  const productId = c.req.param('productId');

  if (!productId) {
    return c.json({ message: 'productId is required' }, 400);
  }

  const cart = await cartService.removeItem(user.id, productId);
  return c.json(cart);
};

export const clearCartController = async (c: Context) => {
  const user = c.get('user');
  const cart = await cartService.clearCart(user.id);
  return c.json(cart);
};
