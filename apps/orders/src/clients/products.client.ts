import { ordersConfig } from '../config/orders.config.js';

export type ProductSummary = {
  id: string;
  name: string;
  price: number;
};

/**
 * Fetches a product from the products microservice (REST). Returns null when the
 * product does not exist so the caller can reject the order item.
 */
export const fetchProduct = async (productId: string, requestId: string): Promise<ProductSummary | null> => {
  const url = new URL(`/products/${encodeURIComponent(productId)}`, ordersConfig.productsServiceUrl);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'x-request-id': requestId }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`products service responded with ${response.status}`);
  }

  const body = (await response.json()) as { data?: { _id?: string; name?: string; price?: number } };
  const product = body.data;

  if (!product || typeof product.price !== 'number') {
    return null;
  }

  return {
    id: product._id ?? productId,
    name: product.name ?? 'Unknown product',
    price: product.price
  };
};
