import type { PaymentProvider } from './payment.provider.js';

/**
 * Fake provider used until real Stripe wiring lands (Phase 3). It "creates" a
 * payment intent deterministically from the order id so the full checkout and
 * confirmation state machine can be exercised without external calls.
 */
export const mockPaymentProvider: PaymentProvider = {
  name: 'mock',

  async createPayment({ orderId }) {
    return {
      providerPaymentId: `mock_pi_${orderId}`,
      clientSecret: `mock_secret_${orderId}`
    };
  }
};
