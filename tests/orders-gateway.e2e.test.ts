import { beforeAll, describe, expect, it } from 'vitest';

const baseUrl = process.env.TEST_GATEWAY_URL ?? 'http://localhost:4000';

const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

// A unique source IP per login keeps the gateway login rate-limiter from
// tripping when the whole suite runs together.
const randomIp = () =>
  `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

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
  const email = uniqueEmail('orders-user');
  const password = 'Password123';

  const ip = randomIp();

  await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ email, password })
  });

  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ email, password })
  });
  const body = (await loginResponse.json()) as { accessToken: string };
  return body.accessToken;
};

const headers = (token: string) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });

const createProduct = async (token: string, price: number) => {
  const response = await fetch(`${baseUrl}/products`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ name: 'Orders E2E Product', price })
  });
  const body = (await response.json()) as { data: { _id: string } };
  return body.data._id;
};

const addToCart = (token: string, productId: string, quantity: number) =>
  fetch(`${baseUrl}/cart/items`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ productId, quantity })
  });

beforeAll(async () => {
  await waitForReady();
});

describe('orders + gateway e2e', () => {
  it('rejects checkout without a token', async () => {
    const response = await fetch(`${baseUrl}/orders/checkout`, { method: 'POST' });
    expect(response.status).toBe(401);
  });

  it('rejects checkout with an empty cart', async () => {
    const token = await authToken();
    const response = await fetch(`${baseUrl}/orders/checkout`, { method: 'POST', headers: headers(token) });
    expect(response.status).toBe(400);
  });

  it('checks out, computes cents server-side, then confirms payment and clears the cart', async () => {
    const token = await authToken();
    const productId = await createProduct(token, 19.99);
    await addToCart(token, productId, 2);

    const checkoutResponse = await fetch(`${baseUrl}/orders/checkout`, { method: 'POST', headers: headers(token) });
    expect(checkoutResponse.status).toBe(201);

    const checkout = (await checkoutResponse.json()) as {
      order: {
        id: string;
        status: string;
        subtotalCents: number;
        totalCents: number;
        items: { productId: string; nameSnapshot: string; unitPriceCents: number; quantity: number; lineTotalCents: number }[];
      };
      payment: { provider: string; providerPaymentId: string; clientSecret: string | null; status: string };
    };

    expect(checkout.order.status).toBe('AWAITING_PAYMENT');
    expect(checkout.order.totalCents).toBe(3998);
    expect(checkout.order.items).toHaveLength(1);
    expect(checkout.order.items[0]).toMatchObject({
      productId,
      nameSnapshot: 'Orders E2E Product',
      unitPriceCents: 1999,
      quantity: 2,
      lineTotalCents: 3998
    });
    expect(checkout.payment.provider).toBe('mock');
    expect(checkout.payment.status).toBe('PENDING');

    const orderId = checkout.order.id;

    const confirmResponse = await fetch(`${baseUrl}/orders/${orderId}/payment/mock-confirm`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ outcome: 'success' })
    });
    expect(confirmResponse.status).toBe(200);
    const confirmed = (await confirmResponse.json()) as { status: string; payment: { status: string } };
    expect(confirmed.status).toBe('PAID');
    expect(confirmed.payment.status).toBe('SUCCEEDED');

    // cart cleared after successful payment
    const cartResponse = await fetch(`${baseUrl}/cart`, { headers: { Authorization: `Bearer ${token}` } });
    const cart = (await cartResponse.json()) as { items: unknown[] };
    expect(cart.items).toEqual([]);

    // idempotent re-confirm
    const reConfirm = await fetch(`${baseUrl}/orders/${orderId}/payment/mock-confirm`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ outcome: 'success' })
    });
    expect(reConfirm.status).toBe(200);
    const reConfirmed = (await reConfirm.json()) as { status: string };
    expect(reConfirmed.status).toBe('PAID');
  });

  it('rejects checkout when a product in the cart no longer exists', async () => {
    const token = await authToken();
    const productId = await createProduct(token, 5);
    await addToCart(token, productId, 1);

    const deleteResponse = await fetch(`${baseUrl}/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(deleteResponse.status).toBe(200);

    const checkoutResponse = await fetch(`${baseUrl}/orders/checkout`, { method: 'POST', headers: headers(token) });
    expect(checkoutResponse.status).toBe(409);
  });

  it('does not expose another user order', async () => {
    const tokenA = await authToken();
    const tokenB = await authToken();

    const productId = await createProduct(tokenB, 3);
    await addToCart(tokenB, productId, 1);
    const checkout = (await (await fetch(`${baseUrl}/orders/checkout`, { method: 'POST', headers: headers(tokenB) })).json()) as {
      order: { id: string };
    };

    const asA = await fetch(`${baseUrl}/orders/${checkout.order.id}`, { headers: { Authorization: `Bearer ${tokenA}` } });
    expect(asA.status).toBe(404);

    const asB = await fetch(`${baseUrl}/orders/${checkout.order.id}`, { headers: { Authorization: `Bearer ${tokenB}` } });
    expect(asB.status).toBe(200);
  });
});
