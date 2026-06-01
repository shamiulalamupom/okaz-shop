import { ordersConfig } from '../config/orders.config.js';

export type CartLine = {
  productId: string;
  quantity: number;
};

/**
 * Internal client for the cart service. Orders is network-isolated and trusted,
 * so it sets the X-User-Id header directly (the same identity contract the
 * gateway uses).
 */
export const cartClient = {
  async getItems(userId: string): Promise<CartLine[]> {
    const response = await fetch(new URL('/cart', ordersConfig.cartServiceUrl), {
      headers: { 'x-user-id': userId }
    });

    if (!response.ok) {
      throw new Error('CART_SERVICE_UNAVAILABLE');
    }

    const body = (await response.json().catch(() => null)) as {
      items?: { productId: string; quantity: number }[];
    } | null;

    return (body?.items ?? []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity
    }));
  },

  async clear(userId: string): Promise<void> {
    await fetch(new URL('/cart', ordersConfig.cartServiceUrl), {
      method: 'DELETE',
      headers: { 'x-user-id': userId }
    });
  }
};
