import { ordersConfig } from '../config/orders.config.js';

export type ReservationItem = {
  productId: string;
  storeId: string;
  quantity: number;
};

export type ReserveResult =
  | { ok: true }
  | { ok: false; shortages: Array<{ productId: string; storeId: string; requested: number; available: number }> };

const callStocks = async (path: string, items: ReservationItem[], requestId: string) => {
  const url = new URL(path, ordersConfig.stocksServiceUrl);

  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-request-id': requestId,
      'x-internal-secret': ordersConfig.internalServiceSecret
    },
    body: JSON.stringify({ items })
  });
};

/** Atomically reserves stock for all items via the stocks service. */
export const reserveStock = async (items: ReservationItem[], requestId: string): Promise<ReserveResult> => {
  const response = await callStocks('/internal/stocks/reserve', items, requestId);

  if (response.ok) {
    return { ok: true };
  }

  if (response.status === 409) {
    const body = (await response.json()) as {
      shortages?: Array<{ productId: string; storeId: string; requested: number; available: number }>;
    };
    return { ok: false, shortages: body.shortages ?? [] };
  }

  throw new Error(`stocks service responded with ${response.status}`);
};

/** Returns previously reserved stock (best-effort, e.g. on cancellation). */
export const releaseStock = async (items: ReservationItem[], requestId: string): Promise<void> => {
  const response = await callStocks('/internal/stocks/release', items, requestId);

  if (!response.ok) {
    throw new Error(`stocks service responded with ${response.status}`);
  }
};
