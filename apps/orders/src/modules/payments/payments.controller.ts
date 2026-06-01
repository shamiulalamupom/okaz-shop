import type { Stripe } from 'stripe';
import type { Context } from 'hono';

import { ordersConfig } from '../../config/orders.config.js';
import { prisma } from '../../db/prisma.client.js';
import { getStripeClient } from '../../payment/stripe.provider.js';
import { ordersService } from '../orders/orders.service.js';

/**
 * Public Stripe webhook. Authenticated by the Stripe signature (not a JWT), so
 * it must read the raw request body and is mounted outside the user-context
 * middleware. Idempotent via the ProcessedWebhookEvent table.
 */
export const stripeWebhookController = async (c: Context) => {
  // The webhook only exists in stripe mode; mock mode uses /orders/:id/payment/mock-confirm.
  if (ordersConfig.paymentProvider !== 'stripe' || !ordersConfig.stripeWebhookSecret) {
    return c.json({ message: 'Not Found' }, 404);
  }

  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ message: 'Missing Stripe signature' }, 400);
  }

  const rawBody = Buffer.from(await c.req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, ordersConfig.stripeWebhookSecret);
  } catch {
    return c.json({ message: 'Invalid signature' }, 400);
  }

  // Idempotency: skip events we've already applied.
  const seen = await prisma.processedWebhookEvent.findUnique({ where: { eventId: event.id } });
  if (seen) {
    return c.json({ received: true });
  }

  if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.orderId;

    if (orderId) {
      const outcome = event.type === 'payment_intent.succeeded' ? 'success' : 'failure';
      // Swallow unknown-order / invalid-state so Stripe doesn't retry forever.
      await ordersService.settlePayment(orderId, outcome).catch(() => undefined);
    }
  }

  await prisma.processedWebhookEvent
    .create({ data: { eventId: event.id, type: event.type } })
    .catch(() => undefined);

  return c.json({ received: true });
};
