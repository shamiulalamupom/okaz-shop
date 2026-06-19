#!/usr/bin/env node
/**
 * Re-seeds the catalogue through the API gateway with a curated set of products,
 * some carrying stock across stores and some intentionally left with no stock.
 *
 * Usage:
 *   node scripts/seed-products.mjs
 *
 * Env:
 *   GATEWAY_URL     (default http://localhost:4000)
 *   ADMIN_EMAIL     (default admin@example.com)
 *   ADMIN_PASSWORD  (default Admin1234!)
 *
 * Requires the auth admin to be seeded (docker compose exec auth pnpm prisma:seed)
 * and the stocks service to have stores (seeded automatically on first start).
 */

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.ADMIN_SEED_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? 'Admin1234!';

// stockByStore: quantities applied to stores by index (0-based). Missing/empty => no stock.
const PRODUCTS = [
  { name: 'Aurora Wireless Headphones', category: 'Audio', price: 149.9, description: 'Over-ear ANC headphones with 30h battery.', stockByStore: [12, 5] },
  { name: 'Nimbus Mechanical Keyboard', category: 'Computers', price: 89.0, description: 'Hot-swappable switches, compact 75% layout.', stockByStore: [8] },
  { name: 'Pulse Smartwatch', category: 'Wearables', price: 199.0, description: 'Fitness tracking, GPS and AMOLED display.', stockByStore: [0, 3] },
  { name: 'Terra Insulated Bottle', category: 'Home', price: 24.5, description: 'Keeps drinks cold 24h / hot 12h.', stockByStore: [20, 15, 10] },
  { name: 'Zephyr Bluetooth Speaker', category: 'Audio', price: 59.9, description: 'Waterproof portable speaker, deep bass.', stockByStore: [0, 0, 7] },
  { name: 'Vertex Ergonomic Mouse', category: 'Computers', price: 39.0, description: 'Vertical mouse for all-day comfort.', stockByStore: [] },
  { name: 'Lumen LED Desk Lamp', category: 'Home', price: 32.0, description: 'Dimmable lamp with USB-C charging.', stockByStore: [] },
  { name: 'Quartz Phone Stand', category: 'Accessories', price: 14.0, description: 'Aluminium adjustable phone stand.', stockByStore: [] },
];

const api = async (path, { method = 'GET', token, body } = {}) => {
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
  }

  return payload;
};

const main = async () => {
  console.log(`Seeding catalogue via ${GATEWAY_URL} ...`);

  // 1. Authenticate as admin.
  const login = await api('/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const token = login.accessToken;
  if (!token) throw new Error('Login did not return an access token.');

  // 2. Resolve stores.
  const stores = (await api('/stores', { token })).data ?? [];
  if (stores.length === 0) throw new Error('No stores found. Is the stocks service seeded?');
  console.log(`Found ${stores.length} store(s): ${stores.map((s) => s.name).join(', ')}`);

  // 3. Wipe existing products for a clean re-seed.
  const existing = (await api('/products')).data ?? [];
  for (const product of existing) {
    await api(`/products/${product._id}`, { method: 'DELETE', token });
  }
  console.log(`Removed ${existing.length} existing product(s).`);

  // 4. Create products and apply stock.
  let withStock = 0;
  let withoutStock = 0;

  for (const spec of PRODUCTS) {
    const created = await api('/products', {
      method: 'POST',
      token,
      body: { name: spec.name, description: spec.description, price: spec.price, category: spec.category },
    });
    const productId = created.data._id;

    const entries = (spec.stockByStore ?? [])
      .map((quantity, index) => ({ store: stores[index], quantity }))
      .filter((entry) => entry.store && entry.quantity > 0);

    for (const entry of entries) {
      await api('/stocks', { method: 'POST', token, body: { productId, storeId: entry.store.id, quantity: entry.quantity } });
    }

    if (entries.length > 0) {
      withStock += 1;
      const summary = entries.map((e) => `${e.store.name}:${e.quantity}`).join(', ');
      console.log(`  + ${spec.name}  [stock: ${summary}]`);
    } else {
      withoutStock += 1;
      console.log(`  + ${spec.name}  [no stock]`);
    }
  }

  console.log(`\nDone. ${PRODUCTS.length} products (${withStock} with stock, ${withoutStock} without).`);
};

main().catch((error) => {
  console.error('\nSeed failed:', error.message);
  process.exit(1);
});
