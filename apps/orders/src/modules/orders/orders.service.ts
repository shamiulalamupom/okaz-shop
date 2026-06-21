import { createLogger } from '@okaz/shared';
import type { Order, OrderItem } from '../../../prisma/generated/client/index.js';

import { fetchProduct } from '../../clients/products.client.js';
import { releaseStock, reserveStock } from '../../clients/stocks.client.js';
import { prisma } from '../../db/prisma.client.js';
import { publishOrderEvent } from '../../events/events.publisher.js';
import { publishOrderNotification } from '../../events/notifications.publisher.js';
import type { CreateOrderInput } from './orders.schemas.js';

const logger = createLogger('orders-service');

export class ProductNotFoundError extends Error {
  constructor(public readonly productId: string) {
    super(`Product not found: ${productId}`);
    this.name = 'ProductNotFoundError';
  }
}

type OrderWithItems = Order & { items: OrderItem[] };

const serializeOrder = (order: OrderWithItems) => ({
  id: order.id,
  userId: order.userId,
  userEmail: order.userEmail,
  status: order.status,
  total: Number(order.total),
  reason: order.reason,
  shippingAddress: order.shippingAddress,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  items: order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    storeId: item.storeId,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice)
  }))
});

export const ordersService = {
  async listForUser(userId: string) {
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });

    return orders.map(serializeOrder);
  },

  async getForUser(orderId: string, userId: string, isPrivileged: boolean) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });

    if (!order || (order.userId !== userId && !isPrivileged)) {
      return null;
    }

    return serializeOrder(order);
  },

  /** Lists every order (admin view across all customers). */
  async listAll() {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });

    return orders.map(serializeOrder);
  },

  /**
   * Creates an order and validates it against available stock.
   * The order is persisted as PENDING, then transitions to VALIDATED if every line
   * has sufficient stock (atomically reserved), or REJECTED otherwise.
   */
  async create(userId: string, userEmail: string, input: CreateOrderInput, requestId: string) {
    // 1. Resolve product prices / existence from the products service.
    const lines = await Promise.all(
      input.items.map(async (item) => {
        const product = await fetchProduct(item.productId, requestId);
        if (!product) {
          throw new ProductNotFoundError(item.productId);
        }
        return { ...item, unitPrice: product.price };
      })
    );

    const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

    // 2. Persist the order as PENDING with its items.
    const created = await prisma.order.create({
      data: {
        userId,
        userEmail,
        status: 'PENDING',
        total,
        shippingAddress: input.shippingAddress,
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            storeId: line.storeId,
            quantity: line.quantity,
            unitPrice: line.unitPrice
          }))
        }
      },
      include: { items: true }
    });

    await publishOrderEvent(
      {
        type: 'order.created',
        orderId: created.id,
        userId,
        status: created.status,
        total: Number(created.total),
        at: new Date().toISOString()
      },
      requestId
    );

    // Notify staff that a new order was placed (actor is the customer, so the
    // customer is excluded from any of their own events downstream).
    await publishOrderNotification(
      {
        type: 'order.placed',
        orderId: created.id,
        customerId: userId,
        actorId: userId,
        total: Number(created.total)
      },
      requestId
    );

    // 3. Attempt to reserve stock and finalize the order status.
    const reservationItems = lines.map((line) => ({
      productId: line.productId,
      storeId: line.storeId,
      quantity: line.quantity
    }));

    let finalized = created;

    try {
      const reservation = await reserveStock(reservationItems, requestId);

      if (reservation.ok) {
        finalized = await prisma.order.update({
          where: { id: created.id },
          data: { status: 'VALIDATED', reason: null },
          include: { items: true }
        });
      } else {
        const reason = `Insufficient stock: ${reservation.shortages
          .map((s) => `${s.productId}@${s.storeId} (req ${s.requested}/avail ${s.available})`)
          .join(', ')}`;
        finalized = await prisma.order.update({
          where: { id: created.id },
          data: { status: 'REJECTED', reason },
          include: { items: true }
        });
      }
    } catch (error) {
      logger.error('stock_reservation_failed', {
        orderId: created.id,
        requestId,
        message: error instanceof Error ? error.message : 'unknown'
      });
      // Leave the order PENDING so it can be retried/handled manually.
      return serializeOrder(finalized);
    }

    await publishOrderEvent(
      {
        type: finalized.status === 'VALIDATED' ? 'order.validated' : 'order.rejected',
        orderId: finalized.id,
        userId,
        status: finalized.status,
        total: Number(finalized.total),
        at: new Date().toISOString()
      },
      requestId
    );

    return serializeOrder(finalized);
  },

  /** Cancels a VALIDATED or PENDING order and releases reserved stock when applicable. */
  async cancel(orderId: string, userId: string, isPrivileged: boolean, requestId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });

    if (!order || (order.userId !== userId && !isPrivileged)) {
      return { notFound: true as const };
    }

    if (order.status === 'CANCELLED' || order.status === 'REJECTED' || order.status === 'DELIVERED') {
      return { invalid: true as const, order: serializeOrder(order) };
    }

    if (order.status === 'VALIDATED') {
      await releaseStock(
        order.items.map((item) => ({
          productId: item.productId,
          storeId: item.storeId,
          quantity: item.quantity
        })),
        requestId
      );
    }

    const cancelled = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
      include: { items: true }
    });

    await publishOrderEvent(
      {
        type: 'order.cancelled',
        orderId: cancelled.id,
        userId: cancelled.userId,
        status: cancelled.status,
        total: Number(cancelled.total),
        at: new Date().toISOString()
      },
      requestId
    );

    return { order: serializeOrder(cancelled) };
  },

  /**
   * Admin action: validates a PENDING or REJECTED order by (re)attempting the
   * stock reservation. Succeeds → VALIDATED (stock decremented); insufficient →
   * REJECTED. Used to clear orders left unvalidated (e.g. stock service was down).
   */
  async validateByAdmin(orderId: string, actorId: string, requestId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });

    if (!order) {
      return { notFound: true as const };
    }

    if (order.status !== 'PENDING' && order.status !== 'REJECTED') {
      return { invalid: true as const, order: serializeOrder(order) };
    }

    const reservationItems = order.items.map((item) => ({
      productId: item.productId,
      storeId: item.storeId,
      quantity: item.quantity
    }));

    let finalized = order;
    try {
      const reservation = await reserveStock(reservationItems, requestId);

      if (reservation.ok) {
        finalized = await prisma.order.update({
          where: { id: order.id },
          data: { status: 'VALIDATED', reason: null },
          include: { items: true }
        });
      } else {
        const reason = `Insufficient stock: ${reservation.shortages
          .map((s) => `${s.productId}@${s.storeId} (req ${s.requested}/avail ${s.available})`)
          .join(', ')}`;
        finalized = await prisma.order.update({
          where: { id: order.id },
          data: { status: 'REJECTED', reason },
          include: { items: true }
        });
      }
    } catch (error) {
      logger.error('admin_validate_failed', {
        orderId: order.id,
        requestId,
        message: error instanceof Error ? error.message : 'unknown'
      });
      return { unavailable: true as const };
    }

    await publishOrderEvent(
      {
        type: finalized.status === 'VALIDATED' ? 'order.validated' : 'order.rejected',
        orderId: finalized.id,
        userId: finalized.userId,
        status: finalized.status,
        total: Number(finalized.total),
        at: new Date().toISOString()
      },
      requestId
    );

    // Notify the customer of the outcome (actor is the staff member, so they are
    // excluded; the customer who owns the order is notified).
    await publishOrderNotification(
      {
        type: finalized.status === 'VALIDATED' ? 'order.validated' : 'order.rejected',
        orderId: finalized.id,
        customerId: finalized.userId,
        actorId,
        total: Number(finalized.total)
      },
      requestId
    );

    return { order: serializeOrder(finalized) };
  },

  /**
   * Management action: marks a VALIDATED order as DELIVERED and notifies the
   * customer. Only VALIDATED orders can transition to DELIVERED.
   */
  async deliver(orderId: string, actorId: string, requestId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });

    if (!order) {
      return { notFound: true as const };
    }

    if (order.status !== 'VALIDATED') {
      return { invalid: true as const, order: serializeOrder(order) };
    }

    const delivered = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERED' },
      include: { items: true }
    });

    await publishOrderEvent(
      {
        type: 'order.delivered',
        orderId: delivered.id,
        userId: delivered.userId,
        status: delivered.status,
        total: Number(delivered.total),
        at: new Date().toISOString()
      },
      requestId
    );

    await publishOrderNotification(
      {
        type: 'order.delivered',
        orderId: delivered.id,
        customerId: delivered.userId,
        actorId,
        total: Number(delivered.total)
      },
      requestId
    );

    return { order: serializeOrder(delivered) };
  }
};
