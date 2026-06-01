import { beforeAll, describe, expect, it } from 'vitest';

const baseUrl = process.env.TEST_GATEWAY_URL ?? 'http://localhost:4000';

const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const waitForReady = async () => {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/ready`);
      if (response.ok) {
        return;
      }
    } catch {
      // ignored
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Gateway is not ready at ${baseUrl}/ready`);
};

const authToken = async () => {
  const email = uniqueEmail('cart-user');
  const password = 'Password123';

  const registerResponse = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  expect(registerResponse.status).toBe(201);

  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  expect(loginResponse.status).toBe(200);

  const body = (await loginResponse.json()) as { accessToken: string; user: { id: string } };
  return { token: body.accessToken, userId: body.user.id };
};

const createProduct = async (token: string, price: number) => {
  const response = await fetch(`${baseUrl}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Cart E2E Product', price })
  });
  expect(response.status).toBe(201);

  const body = (await response.json()) as { data: { _id: string } };
  return body.data._id;
};

const getCart = (token: string, extraHeaders: Record<string, string> = {}) =>
  fetch(`${baseUrl}/cart`, { headers: { Authorization: `Bearer ${token}`, ...extraHeaders } });

beforeAll(async () => {
  await waitForReady();
});

describe('cart + gateway e2e', () => {
  it('rejects cart access without a token', async () => {
    const response = await fetch(`${baseUrl}/cart`);
    expect(response.status).toBe(401);
  });

  it('starts with an empty cart', async () => {
    const { token } = await authToken();
    const response = await getCart(token);
    expect(response.status).toBe(200);

    const body = (await response.json()) as { items: unknown[]; total: number };
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('adds an item, enriches it from products, and increments on re-add', async () => {
    const { token } = await authToken();
    const productId = await createProduct(token, 10);

    const addResponse = await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId, quantity: 3 })
    });
    expect(addResponse.status).toBe(201);

    const addBody = (await addResponse.json()) as {
      items: { productId: string; quantity: number; name: string; unitPrice: number; lineTotal: number; available: boolean }[];
      total: number;
    };
    expect(addBody.items).toHaveLength(1);
    expect(addBody.items[0]).toMatchObject({
      productId,
      quantity: 3,
      name: 'Cart E2E Product',
      unitPrice: 10,
      lineTotal: 30,
      available: true
    });
    expect(addBody.total).toBe(30);

    const reAddResponse = await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId, quantity: 2 })
    });
    const reAddBody = (await reAddResponse.json()) as { items: { quantity: number }[]; total: number };
    expect(reAddBody.items[0].quantity).toBe(5);
    expect(reAddBody.total).toBe(50);
  });

  it('updates quantity and removes the item', async () => {
    const { token } = await authToken();
    const productId = await createProduct(token, 4);

    await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId, quantity: 1 })
    });

    const patchResponse = await fetch(`${baseUrl}/cart/items/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity: 6 })
    });
    expect(patchResponse.status).toBe(200);
    const patchBody = (await patchResponse.json()) as { total: number };
    expect(patchBody.total).toBe(24);

    const deleteResponse = await fetch(`${baseUrl}/cart/items/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(deleteResponse.status).toBe(200);
    const deleteBody = (await deleteResponse.json()) as { items: unknown[] };
    expect(deleteBody.items).toEqual([]);
  });

  it('returns 404 for an unknown product', async () => {
    const { token } = await authToken();
    const response = await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId: '000000000000000000000000', quantity: 1 })
    });
    expect(response.status).toBe(404);
  });

  it('ignores a client-supplied X-User-Id (no identity spoofing)', async () => {
    const { token, userId } = await authToken();
    const response = await getCart(token, { 'X-User-Id': 'attacker-injected-id' });
    expect(response.status).toBe(200);

    const body = (await response.json()) as { userId: string };
    expect(body.userId).toBe(userId);
  });
});
