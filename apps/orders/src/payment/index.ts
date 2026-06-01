import { ordersConfig } from '../config/orders.config.js';
import { mockPaymentProvider } from './mock.provider.js';
import type { PaymentProvider } from './payment.provider.js';

const providers: Record<string, PaymentProvider> = {
  mock: mockPaymentProvider
  // stripe: stripePaymentProvider  // added in Phase 3
};

export const paymentProvider: PaymentProvider = providers[ordersConfig.paymentProvider] ?? mockPaymentProvider;

export type { PaymentProvider } from './payment.provider.js';
