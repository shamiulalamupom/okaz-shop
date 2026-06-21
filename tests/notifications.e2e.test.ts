import { beforeAll, describe, expect, it } from 'vitest';

import {
  api,
  createProduct,
  deliverOrder,
  getNotifications,
  getStores,
  getUnreadCount,
  loginAdmin,
  placeOrder,
  registerCustomer,
  setStock,
  waitForNotification,
  waitForReady,
  type Order,
  type Store,
} from './support/client.js';

let adminToken: string;
let stores: Store[];

/** Places a fresh validated order for a new customer. Returns the customer + order. */
const placeValidatedOrder = async (prefix: string) => {
  const customer = await registerCustomer(prefix);
  const productId = await createProduct(adminToken, { price: 10 });
  await setStock(adminToken, productId, stores[0].id, 5);
  const placed = await placeOrder(customer.token, [{ productId, storeId: stores[0].id, quantity: 1 }]);
  expect(placed.status).toBe(201);
  expect(placed.body.status).toBe('VALIDATED');
  return { customer, order: placed.body };
};

beforeAll(async () => {
  await waitForReady();
  adminToken = await loginAdmin();
  stores = await getStores(adminToken);
  expect(stores.length).toBeGreaterThan(0);
});

describe('notifications (e2e)', () => {
  it('requires authentication to read the feed', async () => {
    expect((await api('/notifications')).status).toBe(401);
    expect((await api('/notifications/unread-count')).status).toBe(401);
  });

  it('notifies staff when a customer places an order', async () => {
    const { order } = await placeValidatedOrder('notif-place');

    const staffNotification = await waitForNotification(
      adminToken,
      (n) => n.orderId === order.id && n.type === 'ORDER_PLACED',
    );
    expect(staffNotification.title).toMatch(/new order/i);
  });

  it('does not notify the customer of their own order (exclude-actor rule)', async () => {
    const { customer, order } = await placeValidatedOrder('notif-self');

    // The customer placed (and auto-validated) the order themselves, so they are
    // the actor for every event so far and must receive nothing.
    const feed = await getNotifications(customer.token);
    expect(feed.some((n) => n.orderId === order.id)).toBe(false);
    expect(await getUnreadCount(customer.token)).toBe(0);
  });

  it('notifies the customer when their order is delivered', async () => {
    const { customer, order } = await placeValidatedOrder('notif-deliver');

    const delivered = await deliverOrder(adminToken, order.id);
    expect(delivered.status).toBe(200);
    expect(delivered.body.status).toBe('DELIVERED');

    const notification = await waitForNotification(
      customer.token,
      (n) => n.orderId === order.id && n.type === 'ORDER_DELIVERED',
    );
    expect(notification.title).toMatch(/delivered/i);
    expect(notification.read).toBe(false);
  });

  it('forbids non-staff from marking an order delivered', async () => {
    const { customer, order } = await placeValidatedOrder('notif-forbid');
    const result = await deliverOrder(customer.token, order.id);
    expect(result.status).toBe(403);
  });

  it('rejects delivering an order that is not validated', async () => {
    const { order } = await placeValidatedOrder('notif-twice');

    expect((await deliverOrder(adminToken, order.id)).status).toBe(200);
    // Already delivered → cannot deliver again.
    expect((await deliverOrder(adminToken, order.id)).status).toBe(409);
  });

  it('refuses to cancel a delivered order', async () => {
    const { customer, order } = await placeValidatedOrder('notif-cancel');
    expect((await deliverOrder(adminToken, order.id)).status).toBe(200);

    const cancel = await api<Order>(`/orders/${order.id}/cancel`, { method: 'POST', token: customer.token });
    expect(cancel.status).toBe(409);
  });

  it('marks a single notification read and clears the unread count', async () => {
    const { customer, order } = await placeValidatedOrder('notif-read');
    expect((await deliverOrder(adminToken, order.id)).status).toBe(200);

    const notification = await waitForNotification(
      customer.token,
      (n) => n.orderId === order.id && n.type === 'ORDER_DELIVERED',
    );
    expect(await getUnreadCount(customer.token)).toBe(1);

    const read = await api(`/notifications/${notification.id}/read`, { method: 'POST', token: customer.token });
    expect(read.status).toBe(200);
    expect(await getUnreadCount(customer.token)).toBe(0);
  });

  it('marks all notifications read', async () => {
    const { customer, order } = await placeValidatedOrder('notif-readall');
    expect((await deliverOrder(adminToken, order.id)).status).toBe(200);
    await waitForNotification(customer.token, (n) => n.orderId === order.id);

    const readAll = await api<{ count: number }>('/notifications/read-all', {
      method: 'POST',
      token: customer.token,
    });
    expect(readAll.status).toBe(200);
    expect(await getUnreadCount(customer.token)).toBe(0);
  });

  it('scopes a notification to its recipient (cannot read someone else\'s)', async () => {
    const { customer, order } = await placeValidatedOrder('notif-scope');
    expect((await deliverOrder(adminToken, order.id)).status).toBe(200);
    const notification = await waitForNotification(customer.token, (n) => n.orderId === order.id);

    const other = await registerCustomer('notif-intruder');
    const result = await api(`/notifications/${notification.id}/read`, { method: 'POST', token: other.token });
    expect(result.status).toBe(404);
  });
});
