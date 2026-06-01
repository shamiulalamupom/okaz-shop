import { OrderStatus, PaymentStatus } from '@prisma/client';

import { cartClient } from '../../clients/cart.client.js';
import { productsClient } from '../../clients/products.client.js';
import { ordersConfig } from '../../config/orders.config.js';
import { prisma } from '../../db/prisma.client.js';
import { paymentProvider } from '../../payment/index.js';

export type OrderErrorCode =
  | 'CART_EMPTY'
  | 'PRODUCT_UNAVAILABLE'
  | 'ORDER_NOT_FOUND'
  | 'INVALID_STATE'
  | 'UPSTREAM_UNAVAILABLE';

export class OrderError extends Error {
  constructor(
    public readonly code: OrderErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

const toCents = (price: number) => Math.round(price * 100);

const loadOrderForUser = async (userId: string, orderId: string) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true, payment: true }
  });

  if (!order) {
    throw new OrderError('ORDER_NOT_FOUND', 'Order not found');
  }

  return order;
};

export const ordersService = {
  async checkout(userId: string) {
    let cartLines;
    try {
      cartLines = await cartClient.getItems(userId);
    } catch {
      throw new OrderError('UPSTREAM_UNAVAILABLE', 'Cart service unavailable');
    }

    if (cartLines.length === 0) {
      throw new OrderError('CART_EMPTY', 'Cart is empty');
    }

    // Prices are always taken from the products service at checkout time, never
    // from the client or the cart's display values.
    const lineItems = await Promise.all(
      cartLines.map(async (line) => {
        let product;
        try {
          product = await productsClient.getProduct(line.productId);
        } catch {
          throw new OrderError('UPSTREAM_UNAVAILABLE', 'Products service unavailable');
        }

        if (!product) {
          throw new OrderError('PRODUCT_UNAVAILABLE', `Product ${line.productId} is no longer available`);
        }

        const unitPriceCents = toCents(product.price);

        return {
          productId: line.productId,
          nameSnapshot: product.name,
          unitPriceCents,
          quantity: line.quantity,
          lineTotalCents: unitPriceCents * line.quantity
        };
      })
    );

    const subtotalCents = lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
    const totalCents = subtotalCents;

    const order = await prisma.order.create({
      data: {
        userId,
        status: OrderStatus.PENDING,
        currency: ordersConfig.defaultCurrency,
        subtotalCents,
        totalCents,
        items: { create: lineItems }
      }
    });

    const providerPayment = await paymentProvider.createPayment({
      orderId: order.id,
      amountCents: totalCents,
      currency: order.currency
    });

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.AWAITING_PAYMENT },
        include: { items: true, payment: true }
      }),
      prisma.payment.create({
        data: {
          orderId: order.id,
          provider: paymentProvider.name,
          providerPaymentId: providerPayment.providerPaymentId,
          status: PaymentStatus.PENDING,
          amountCents: totalCents,
          currency: order.currency
        }
      })
    ]);

    return {
      order: updatedOrder,
      payment: {
        provider: paymentProvider.name,
        providerPaymentId: providerPayment.providerPaymentId,
        clientSecret: providerPayment.clientSecret,
        status: PaymentStatus.PENDING
      }
    };
  },

  listOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  getOrder(userId: string, orderId: string) {
    return loadOrderForUser(userId, orderId);
  },

  /**
   * Stand-in for the Stripe webhook (Phase 3). Idempotent: confirming an
   * already-paid order is a no-op. On success the cart is cleared (best effort).
   */
  async confirmPayment(userId: string, orderId: string, outcome: 'success' | 'failure') {
    const order = await loadOrderForUser(userId, orderId);

    if (order.status === OrderStatus.PAID) {
      return order;
    }

    if (order.status !== OrderStatus.AWAITING_PAYMENT) {
      throw new OrderError('INVALID_STATE', `Order cannot be confirmed from status ${order.status}`);
    }

    if (outcome === 'failure') {
      await prisma.$transaction([
        prisma.payment.update({ where: { orderId }, data: { status: PaymentStatus.FAILED } }),
        prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.FAILED } })
      ]);

      return loadOrderForUser(userId, orderId);
    }

    await prisma.$transaction([
      prisma.payment.update({ where: { orderId }, data: { status: PaymentStatus.SUCCEEDED } }),
      prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.PAID } })
    ]);

    await cartClient.clear(userId).catch(() => undefined);

    return loadOrderForUser(userId, orderId);
  }
};
