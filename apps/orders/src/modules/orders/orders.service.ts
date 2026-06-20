import { createLogger } from '@okaz/shared';
import type { Order, OrderItem } from '../../../prisma/generated/client/index.js';

import { fetchProduct } from '../../clients/products.client.js';
import { releaseStock, reserveStock } from '../../clients/stocks.client.js';
import { prisma } from '../../db/prisma.client.js';
import { publishOrderEvent } from '../../events/events.publisher.js';
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

  async getForUser(orderId: string, userId: string, isAdmin: boolean) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });

    if (!order || (order.userId !== userId && !isAdmin)) {
      return null;
    }

    return serializeOrder(order);
  },

  /**
   * Creates an order and validates it against available stock.
   * The order is persisted as PENDING, then transitions to VALIDATED if every line
   * has sufficient stock (atomically reserved), or REJECTED otherwise.
   */
  async create(userId: string, input: CreateOrderInput, requestId: string) {
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
        status: 'PENDING',
        total,
        shippingAddress: input.shippingAddress ?? null,
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
  async cancel(orderId: string, userId: string, isAdmin: boolean, requestId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });

    if (!order || (order.userId !== userId && !isAdmin)) {
      return { notFound: true as const };
    }

    if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
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
  }
};
