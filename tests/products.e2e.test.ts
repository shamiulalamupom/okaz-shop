import { beforeAll, describe, expect, it } from 'vitest';

import { api, createProduct, loginAdmin, registerCustomer, uniqueName, waitForReady } from './support/client.js';

let adminToken: string;
let customer: { token: string };

beforeAll(async () => {
  await waitForReady();
  adminToken = await loginAdmin();
  customer = await registerCustomer('products');
});

describe('products catalogue (e2e)', () => {
  it('lists products publicly (no token)', async () => {
    const result = await api<{ data: unknown[] }>('/products');
    expect(result.status).toBe(200);
    expect(Array.isArray(result.body.data)).toBe(true);
  });

  it('returns a single product publicly', async () => {
    const id = await createProduct(adminToken, { name: uniqueName('Readable') });

    const result = await api<{ data: { _id: string; name: string } }>(`/products/${id}`);
    expect(result.status).toBe(200);
    expect(result.body.data._id).toBe(id);
  });

  it('rejects product creation without a token (401)', async () => {
    const result = await api('/products', {
      method: 'POST',
      body: { name: uniqueName('NoAuth'), price: 5 },
    });
    expect(result.status).toBe(401);
  });

  it('forbids product creation for a CUSTOMER (403)', async () => {
    const result = await api('/products', {
      method: 'POST',
      token: customer.token,
      body: { name: uniqueName('CustomerCreate'), price: 5 },
    });
    expect(result.status).toBe(403);
  });

  it('allows product creation for ADMIN (201)', async () => {
    const result = await api<{ data: { _id: string } }>('/products', {
      method: 'POST',
      token: adminToken,
      body: { name: uniqueName('AdminCreate'), price: 12.5, category: 'Test' },
    });
    expect(result.status).toBe(201);
    expect(result.body.data._id).toBeTypeOf('string');
  });

  it('forbids update/delete for a CUSTOMER (403)', async () => {
    const id = await createProduct(adminToken);

    const update = await api(`/products/${id}`, {
      method: 'PUT',
      token: customer.token,
      body: { price: 1 },
    });
    expect(update.status).toBe(403);

    const remove = await api(`/products/${id}`, { method: 'DELETE', token: customer.token });
    expect(remove.status).toBe(403);
  });

  it('allows ADMIN to delete a product, after which it is gone', async () => {
    const id = await createProduct(adminToken, { name: uniqueName('ToDelete') });

    const remove = await api(`/products/${id}`, { method: 'DELETE', token: adminToken });
    expect(remove.status).toBe(200);

    const after = await api(`/products/${id}`);
    expect(after.status).not.toBe(200);
  });

  it('rejects an invalid product payload from ADMIN', async () => {
    // Missing required price.
    const result = await api('/products', {
      method: 'POST',
      token: adminToken,
      body: { name: uniqueName('Invalid') },
    });
    expect(result.status).toBeGreaterThanOrEqual(400);
  });
});
