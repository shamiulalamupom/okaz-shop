#!/usr/bin/env node
/**
 * One-shot seed for a fresh system: users, products + stock, addresses and orders.
 *
 *   pnpm seed            (or: node scripts/seed.mjs)
 *
 * Requires the full stack running via Docker Compose (it seeds the auth users
 * inside the auth container and resets transactional tables via Postgres, then
 * creates everything else through the API gateway).
 *
 * Env:
 *   GATEWAY_URL  (default http://127.0.0.1:4000)
 */

import { execSync } from 'node:child_process';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://127.0.0.1:4000';

const USERS = {
  admin: { email: 'admin@example.com', password: 'Admin1234!' },
  manager: { email: 'manager@example.com', password: 'Manager1234!' },
  alice: { email: 'alice@example.com', password: 'Password123' },
  bob: { email: 'bob@example.com', password: 'Password123' }
};

// stockByStore: quantities applied to stores by index. Missing/0 => no stock.
const PRODUCTS = [
  { name: 'Aurora Wireless Headphones', category: 'Audio', price: 149.9, description: 'Over-ear ANC headphones with 30h battery.', stockByStore: [12, 5] },
  { name: 'Nimbus Mechanical Keyboard', category: 'Computers', price: 89.0, description: 'Hot-swappable switches, compact 75% layout.', stockByStore: [8] },
  { name: 'Pulse Smartwatch', category: 'Wearables', price: 199.0, description: 'Fitness tracking, GPS and AMOLED display.', stockByStore: [0, 3] },
  { name: 'Terra Insulated Bottle', category: 'Home', price: 24.5, description: 'Keeps drinks cold 24h / hot 12h.', stockByStore: [20, 15, 10] },
  { name: 'Zephyr Bluetooth Speaker', category: 'Audio', price: 59.9, description: 'Waterproof portable speaker, deep bass.', stockByStore: [0, 0, 7] },
  { name: 'Vertex Ergonomic Mouse', category: 'Computers', price: 39.0, description: 'Vertical mouse for all-day comfort.', stockByStore: [] },
  { name: 'Lumen LED Desk Lamp', category: 'Home', price: 32.0, description: 'Dimmable lamp with USB-C charging.', stockByStore: [] },
  { name: 'Quartz Phone Stand', category: 'Accessories', price: 14.0, description: 'Aluminium adjustable phone stand.', stockByStore: [] }
];

// A random forwarded IP per request keeps the gateway login rate-limiter from
// tripping when we log several seed users in quickly.
const octet = () => Math.floor(Math.random() * 254) + 1;
const randomIp = () => `10.${octet()}.${octet()}.${octet()}`;

const api = async (path, { method = 'GET', token, body } = {}) => {
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-forwarded-for': randomIp()
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  return { status: response.status, body: payload };
};

const must = async (path, options) => {
  const result = await api(path, options);
  if (result.status >= 400) {
    throw new Error(`${options?.method ?? 'GET'} ${path} -> ${result.status} ${JSON.stringify(result.body)}`);
  }
  return result.body;
};

const runInContainer = (cmd, input) => {
  execSync(cmd, { input, stdio: ['pipe', 'inherit', 'inherit'] });
};

const psql = (database, sql) =>
  runInContainer(`docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d ${database}`, `${sql}\n`);

const main = async () => {
  console.log(`Seeding ${GATEWAY_URL} ...\n`);

  // 1) Users (admin / manager / customers) — seeded directly in the auth service.
  try {
    console.log('• Seeding users (auth)…');
    execSync('docker compose exec -T auth pnpm prisma:seed', { stdio: 'inherit' });
  } catch {
    console.warn('  ! Could not run the auth seed via docker. Is the stack running via `docker compose`?');
  }

  // 2) Reset transactional data so a re-run gives a clean slate.
  try {
    console.log('• Resetting orders, stock entries, addresses and notifications…');
    psql('okaz_orders', 'TRUNCATE "OrderItem", "Order" CASCADE;');
    psql('okaz_stocks', 'TRUNCATE "Stock";');
    psql('okaz_auth', 'TRUNCATE "Address";');
    psql('okaz_notifications', 'TRUNCATE "Notification";');
  } catch {
    console.warn('  ! Could not reset tables via docker (continuing).');
  }

  // 3) Log in every user.
  const tokens = {};
  for (const [key, user] of Object.entries(USERS)) {
    const login = await api('/auth/login', { method: 'POST', body: user });
    if (login.status !== 200 || !login.body?.accessToken) {
      throw new Error(`Login failed for ${user.email} (${login.status}). Did the auth seed run?`);
    }
    tokens[key] = login.body.accessToken;
  }
  console.log(`• Logged in ${Object.keys(USERS).length} users.`);

  // 4) Stores (seeded by the stocks service on first start).
  const stores = (await must('/stores', { token: tokens.admin })).data ?? [];
  if (stores.length === 0) {
    throw new Error('No stores found. Is the stocks service seeded?');
  }

  // 5) Products (wipe + recreate) and stock.
  const existing = (await must('/products')).data ?? [];
  for (const product of existing) {
    await must(`/products/${product._id}`, { method: 'DELETE', token: tokens.admin });
  }
  const idByName = {};
  for (const spec of PRODUCTS) {
    const created = await must('/products', {
      method: 'POST',
      token: tokens.admin,
      body: { name: spec.name, description: spec.description, price: spec.price, category: spec.category }
    });
    idByName[spec.name] = created.data._id;
    for (const [index, quantity] of (spec.stockByStore ?? []).entries()) {
      if (stores[index] && quantity > 0) {
        await must('/stocks', {
          method: 'POST',
          token: tokens.admin,
          body: { productId: created.data._id, storeId: stores[index].id, quantity }
        });
      }
    }
  }
  console.log(`• Created ${PRODUCTS.length} products with stock.`);

  // 6) Addresses for the customers.
  const aliceAddress = await must('/auth/me/addresses', {
    method: 'POST',
    token: tokens.alice,
    body: { label: 'Home', line1: '12 Rue de Rivoli', city: 'Paris', postalCode: '75001', country: 'France' }
  });
  const bobAddress = await must('/auth/me/addresses', {
    method: 'POST',
    token: tokens.bob,
    body: { label: 'Work', line1: '1 Market Street', city: 'Lyon', postalCode: '69001', country: 'France' }
  });
  const fmt = (a) => `${a.label} — ${a.line1}, ${a.postalCode} ${a.city}, ${a.country}`;

  // 7) Orders with a mix of outcomes.
  const placeOrder = (token, items, shippingAddress) =>
    api('/orders', { method: 'POST', token, body: { items, shippingAddress } });

  // VALIDATED
  await placeOrder(
    tokens.alice,
    [{ productId: idByName['Aurora Wireless Headphones'], storeId: stores[0].id, quantity: 2 }],
    fmt(aliceAddress)
  );
  const toDeliver = await placeOrder(
    tokens.bob,
    [{ productId: idByName['Nimbus Mechanical Keyboard'], storeId: stores[0].id, quantity: 1 }],
    fmt(bobAddress)
  );
  // VALIDATED then DELIVERED (notifies the customer)
  if (toDeliver.body?.id) {
    await must(`/orders/${toDeliver.body.id}/deliver`, { method: 'POST', token: tokens.admin });
  }
  // REJECTED (over-order)
  await placeOrder(
    tokens.alice,
    [{ productId: idByName['Pulse Smartwatch'], storeId: stores[1].id, quantity: 999 }],
    fmt(aliceAddress)
  );
  // VALIDATED then CANCELLED
  const toCancel = await placeOrder(
    tokens.bob,
    [{ productId: idByName['Terra Insulated Bottle'], storeId: stores[0].id, quantity: 1 }],
    fmt(bobAddress)
  );
  if (toCancel.body?.id) {
    await must(`/orders/${toCancel.body.id}/cancel`, { method: 'POST', token: tokens.bob });
  }
  console.log('• Created sample orders (validated / delivered / rejected / cancelled).');

  console.log('\nSeed complete.');
  console.log('  admin@example.com / Admin1234!      (ADMIN)');
  console.log('  manager@example.com / Manager1234!  (STORE_MANAGER)');
  console.log('  alice@example.com / Password123     (CUSTOMER)');
  console.log('  bob@example.com / Password123       (CUSTOMER)');
};

main().catch((error) => {
  console.error('\nSeed failed:', error.message);
  process.exit(1);
});
