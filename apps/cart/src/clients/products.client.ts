import { cartConfig } from '../config/cart.config.js';

export type ProductSummary = {
  id: string;
  name: string;
  price: number;
};

/**
 * Thin client over the products service. The products service responds with
 * `{ data: <product | null> }` and returns 500 for malformed ids, both of
 * which we treat as "not found". Network failures are surfaced separately so
 * callers can distinguish them from a missing product.
 */
export const productsClient = {
  async getProduct(productId: string): Promise<ProductSummary | null> {
    let response: Response;

    try {
      response = await fetch(new URL(`/products/${productId}`, cartConfig.productsServiceUrl));
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
