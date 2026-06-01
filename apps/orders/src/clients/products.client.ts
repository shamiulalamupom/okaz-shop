import { ordersConfig } from '../config/orders.config.js';

export type ProductSummary = {
  id: string;
  name: string;
  price: number;
};

/**
 * Reads authoritative product data at checkout time. The products service
 * responds with `{ data: <product | null> }` and 500 for malformed ids, both
 * treated as "not found".
 */
export const productsClient = {
  async getProduct(productId: string): Promise<ProductSummary | null> {
    let response: Response;

    try {
      response = await fetch(new URL(`/products/${productId}`, ordersConfig.productsServiceUrl));
    } catch {
      throw new Error('PRODUCTS_SERVICE_UNAVAILABLE');
    }

    if (!response.ok) {
      return null;
    }

    const body = (await response.json().catch(() => null)) as {
      data?: { _id?: string; name?: string; price?: number } | null;
    } | null;

    const data = body?.data;
    if (!data || !data._id) {
      return null;
    }

    return {
      id: data._id,
      name: data.name ?? '',
      price: typeof data.price === 'number' ? data.price : 0
    };
  }
};
