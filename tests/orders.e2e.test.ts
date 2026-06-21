import { beforeAll, describe, expect, it } from 'vitest';

import {
  api,
  createProduct,
  getStores,
  loginAdmin,
  placeOrder,
  registerCustomer,
  setStock,
  waitForReady,
  type Order,
  type Store,
  type TestUser,
} from './support/client.js';

let adminToken: string;
let customer: TestUser;
let stores: Store[];

const stockTotal = async (token: string, productId: string) => {
  const result = await api<{ total: number }>(`/stocks/${productId}`, { token });
  return result.body.total;
};

beforeAll(async () => {
  await waitForReady();
  adminToken = await loginAdmin();
  customer = await registerCustomer('orders');
  stores = await getStores(adminToken);
  expect(stores.length).toBeGreaterThan(0);
});

describe('orders lifecycle (e2e)', () => {
  it('requires authentication', async () => {
    const result = await api('/orders', { method: 'POST', body: { items: [] } });
    expect(result.status).toBe(401);
  });

  it('validates an order when stock is sufficient and decrements stock', async () => {
    const productId = await createProduct(adminToken, { price: 10 });
    await setStock(adminToken, productId, stores[0].id, 5);

    const result = await placeOrder(customer.token, [
      { productId, storeId: stores[0].id, quantity: 2 },
    ]);

    expect(result.status).toBe(201);
    expect(result.body.status).toBe('VALIDATED');
    expect(result.body.total).toBe(20);
    expect(await stockTotal(adminToken, productId)).toBe(3);
  });

  it('rejects an order when stock is insufficient and leaves stock untouched', async () => {
    const productId = await createProduct(adminToken, { price: 10 });
    await setStock(adminToken, productId, stores[0].id, 1);

    const result = await placeOrder(customer.token, [
      { productId, storeId: stores[0].id, quantity: 99 },
    ]);

    expect(result.status).toBe(409);
    expect(result.body.status).toBe('REJECTED');
    expect(result.body.reason).toMatch(/insufficient/i);
    expect(await stockTotal(adminToken, productId)).toBe(1);
  });

  it('rejects an order referencing an unknown product (400)', async () => {
    const result = await api('/orders', {
      method: 'POST',
      token: customer.token,
      body: {
        items: [{ productId: '0123456789abcdef01234567', storeId: stores[0].id, quantity: 1 }],
        shippingAddress: '1 Test Street, 75001 Paris, France',
      },
    });
    expect(result.status).toBe(400);
  });

  it('rejects an order without a delivery address (400)', async () => {
    const productId = await createProduct(adminToken, { price: 10 });
    await setStock(adminToken, productId, stores[0].id, 5);

    const result = await api('/orders', {
      method: 'POST',
      token: customer.token,
      body: { items: [{ productId, storeId: stores[0].id, quantity: 1 }] },
    });
    expect(result.status).toBe(400);
  });

  it('reserves all order lines atomically (one insufficient line rejects the whole order)', async () => {
    const productA = await createProduct(adminToken, { price: 10 });
    const productB = await createProduct(adminToken, { price: 10 });
    await setStock(adminToken, productA, stores[0].id, 5);
    await setStock(adminToken, productB, stores[0].id, 1);

    const result = await placeOrder(customer.token, [
      { productId: productA, storeId: stores[0].id, quantity: 2 },
      { productId: productB, storeId: stores[0].id, quantity: 5 },
    ]);

    expect(result.status).toBe(409);
    expect(result.body.status).toBe('REJECTED');

    // Neither line should have been decremented.
    expect(await stockTotal(adminToken, productA)).toBe(5);
    expect(await stockTotal(adminToken, productB)).toBe(1);
  });

  it('scopes order listing and retrieval to the owner', async () => {
    const productId = await createProduct(adminToken, { price: 10 });
    await setStock(adminToken, productId, stores[0].id, 5);

    const placed = await placeOrder(customer.token, [
      { productId, storeId: stores[0].id, quantity: 1 },
    ]);
    expect(placed.status).toBe(201);
    const orderId = placed.body.id;

    // Owner sees it in their list and can fetch it.
    const ownerList = await api<{ data: Order[] }>('/orders', { token: customer.token });
    expect(ownerList.body.data.some((order) => order.id === orderId)).toBe(true);
    expect((await api(`/orders/${orderId}`, { token: customer.token })).status).toBe(200);

    // A different customer cannot see or fetch it.
    const other = await registerCustomer('orders-other');
    const otherList = await api<{ data: Order[] }>('/orders', { token: other.token });
    expect(otherList.body.data.some((order) => order.id === orderId)).toBe(false);
    expect((await api(`/orders/${orderId}`, { token: other.token })).status).toBe(404);
  });

  it('cancels a validated order, restocks, and refuses a second cancel', async () => {
    const productId = await createProduct(adminToken, { price: 10 });
    await setStock(adminToken, productId, stores[0].id, 5);

    const placed = await placeOrder(customer.token, [
      { productId, storeId: stores[0].id, quantity: 2 },
    ]);
    expect(placed.body.status).toBe('VALIDATED');
    expect(await stockTotal(adminToken, productId)).toBe(3);

    const cancel = await api<Order>(`/orders/${placed.body.id}/cancel`, {
      method: 'POST',
      token: customer.token,
    });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('CANCELLED');
    expect(await stockTotal(adminToken, productId)).toBe(5);

    const secondCancel = await api(`/orders/${placed.body.id}/cancel`, {
      method: 'POST',
      token: customer.token,
    });
    expect(secondCancel.status).toBe(409);
  });
});
