import { beforeAll, describe, expect, it } from 'vitest';

import {
  api,
  createProduct,
  createStore,
  getStores,
  loginAdmin,
  registerCustomer,
  setStock,
  uniqueName,
  waitForReady,
  type Store,
} from './support/client.js';

let adminToken: string;
let customer: { token: string };
let stores: Store[];

beforeAll(async () => {
  await waitForReady();
  adminToken = await loginAdmin();
  customer = await registerCustomer('stocks');
  stores = await getStores(adminToken);
  expect(stores.length).toBeGreaterThan(0);
});

describe('stores + stocks (integration)', () => {
  it('requires authentication to read stores and stocks', async () => {
    expect((await api('/stores')).status).toBe(401);
    expect((await api('/stocks')).status).toBe(401);
  });

  it('lets an authenticated customer read stores and stocks', async () => {
    const storesResult = await api<{ data: unknown[] }>('/stores', { token: customer.token });
    expect(storesResult.status).toBe(200);
    expect(Array.isArray(storesResult.body.data)).toBe(true);

    const stocksResult = await api<{ data: unknown[] }>('/stocks', { token: customer.token });
    expect(stocksResult.status).toBe(200);
    expect(Array.isArray(stocksResult.body.data)).toBe(true);
  });

  it('forbids a CUSTOMER from writing stock (403)', async () => {
    const productId = await createProduct(adminToken);
    const result = await setStock(customer.token, productId, stores[0].id, 5);
    expect(result.status).toBe(403);
  });

  it('forbids a CUSTOMER from creating a store (403) but lets an ADMIN create one (201)', async () => {
    const forbidden = await createStore(customer.token, { name: uniqueName('Nope Store'), city: 'Nowhere' });
    expect(forbidden.status).toBe(403);

    const created = await createStore(adminToken, { name: uniqueName('Okaz Test'), city: 'Testville' });
    expect(created.status).toBe(201);
    expect(created.body.id).toBeTruthy();
    expect(created.body.name).toMatch(/Okaz Test/);
  });

  it('lets an ADMIN edit a store but forbids a CUSTOMER (403)', async () => {
    const created = await createStore(adminToken, { name: uniqueName('Editable'), city: 'Paris' });
    expect(created.status).toBe(201);
    const storeId = created.body.id;

    const forbidden = await api(`/stores/${storeId}`, {
      method: 'PUT',
      token: customer.token,
      body: { name: 'Hacked' },
    });
    expect(forbidden.status).toBe(403);

    const newName = uniqueName('Renamed');
    const updated = await api<Store>(`/stores/${storeId}`, {
      method: 'PUT',
      token: adminToken,
      body: { name: newName, city: 'Lyon' },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe(newName);
    expect(updated.body.city).toBe('Lyon');
  });

  it('returns 404 when editing a store that does not exist', async () => {
    const result = await api('/stores/nonexistent-store-id', {
      method: 'PUT',
      token: adminToken,
      body: { name: 'Ghost' },
    });
    expect(result.status).toBe(404);
  });

  it('lets ADMIN set stock and reflects it in the per-product aggregate', async () => {
    const productId = await createProduct(adminToken);

    expect((await setStock(adminToken, productId, stores[0].id, 5)).status).toBe(200);
    if (stores[1]) {
      expect((await setStock(adminToken, productId, stores[1].id, 3)).status).toBe(200);
    }

    const aggregate = await api<{ productId: string; total: number; stocks: unknown[] }>(
      `/stocks/${productId}`,
      { token: customer.token },
    );
    expect(aggregate.status).toBe(200);
    expect(aggregate.body.total).toBe(stores[1] ? 8 : 5);
  });

  it('adjusts stock by a signed delta (ADMIN) and clamps at zero', async () => {
    const productId = await createProduct(adminToken);
    await setStock(adminToken, productId, stores[0].id, 10);

    const decrement = await api<{ quantity: number }>('/stocks/adjust', {
      method: 'POST',
      token: adminToken,
      body: { productId, storeId: stores[0].id, delta: -4 },
    });
    expect(decrement.status).toBe(200);
    expect(decrement.body.quantity).toBe(6);

    const clamp = await api<{ quantity: number }>('/stocks/adjust', {
      method: 'POST',
      token: adminToken,
      body: { productId, storeId: stores[0].id, delta: -100 },
    });
    expect(clamp.status).toBe(200);
    expect(clamp.body.quantity).toBe(0);
  });

  it('rejects a negative absolute quantity (400)', async () => {
    const productId = await createProduct(adminToken);
    const result = await setStock(adminToken, productId, stores[0].id, -1);
    expect(result.status).toBe(400);
  });

  it('does not expose the internal stock-reservation endpoint through the gateway', async () => {
    // Without the internal service secret, the gateway must refuse /internal/*.
    const result = await api('/internal/stocks/reserve', {
      method: 'POST',
      token: adminToken,
      body: { items: [] },
    });
    expect(result.status).toBe(403);
  });
});
