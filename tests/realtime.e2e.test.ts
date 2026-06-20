import WebSocket from 'ws';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  closeSocket,
  createProduct,
  getStores,
  loginAdmin,
  openSocket,
  placeOrder,
  registerCustomer,
  setStock,
  waitForMessage,
  waitForReady,
  type Store,
  type TestUser,
} from './support/client.js';

interface OrderEvent {
  type: string;
  orderId?: string;
  status?: string;
  userId?: string;
}

let adminToken: string;
let customer: TestUser;
let stores: Store[];

beforeAll(async () => {
  await waitForReady();
  adminToken = await loginAdmin();
  customer = await registerCustomer('realtime');
  stores = await getStores(adminToken);
});

describe('realtime order events (e2e)', () => {
  it('rejects a WebSocket connection without a token', async () => {
    const socket = openSocket();

    const outcome = await new Promise<'open' | 'rejected'>((resolve) => {
      socket.on('open', () => resolve('open'));
      socket.on('error', () => resolve('rejected'));
      socket.on('close', () => resolve('rejected'));
    });

    closeSocket(socket);
    expect(outcome).toBe('rejected');
  });

  it('accepts an authenticated connection and greets with connection.ready', async () => {
    const socket = openSocket(customer.token);
    const ready = await waitForMessage<OrderEvent>(socket, (event) => event.type === 'connection.ready');

    expect(ready.type).toBe('connection.ready');
    closeSocket(socket);
  });

  it('pushes order events to the owner in real time', async () => {
    const productId = await createProduct(adminToken, { price: 10 });
    await setStock(adminToken, productId, stores[0].id, 5);

    const socket = openSocket(customer.token);
    // Wait until the socket is open and registered in the gateway hub.
    await waitForMessage<OrderEvent>(socket, (event) => event.type === 'connection.ready');

    // Subscribe before placing the order to avoid missing the event.
    const validatedEvent = waitForMessage<OrderEvent>(
      socket,
      (event) => event.type === 'order.validated',
      10000,
    );

    const placed = await placeOrder(customer.token, [{ productId, storeId: stores[0].id, quantity: 1 }]);
    expect(placed.status).toBe(201);

    const event = await validatedEvent;
    expect(event.orderId).toBe(placed.body.id);
    expect(event.status).toBe('VALIDATED');

    closeSocket(socket);
  });

  it('does not leak another user’s order events across sockets', async () => {
    const other = await registerCustomer('realtime-other');
    const productId = await createProduct(adminToken, { price: 10 });
    await setStock(adminToken, productId, stores[0].id, 5);

    // `other` is listening, but `customer` places the order.
    const otherSocket = openSocket(other.token);
    await waitForMessage<OrderEvent>(otherSocket, (event) => event.type === 'connection.ready');

    let leaked = false;
    otherSocket.on('message', (raw: WebSocket.RawData) => {
      try {
        const event = JSON.parse(raw.toString()) as OrderEvent;
        if (event.type?.startsWith('order.')) {
          leaked = true;
        }
      } catch {
        // ignore
      }
    });

    const placed = await placeOrder(customer.token, [{ productId, storeId: stores[0].id, quantity: 1 }]);
    expect(placed.status).toBe(201);

    // Give events time to (not) arrive.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(leaked).toBe(false);

    closeSocket(otherSocket);
  });
});
