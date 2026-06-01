import Stripe from 'stripe';

import { ordersConfig } from '../config/orders.config.js';
import type { PaymentProvider } from './payment.provider.js';

let client: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (!ordersConfig.stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe');
  }

  if (!client) {
    client = new Stripe(ordersConfig.stripeSecretKey);
  }

  return client;
};

export const stripePaymentProvider: PaymentProvider = {
  name: 'stripe',

  async createPayment({ orderId, amountCents, currency }) {
    const stripe = getStripeClient();

    // idempotencyKey keyed on the order id prevents a double-submitted checkout
    // from creating two PaymentIntents / double charging.
    const intent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency,
        metadata: { orderId },
        automatic_payment_methods: { enabled: true }
      },
      { idempotencyKey: orderId }
    );

    return {
      providerPaymentId: intent.id,
      clientSecret: intent.client_secret
    };
  }
};
