export type CreatePaymentParams = {
  orderId: string;
  amountCents: number;
  currency: string;
};

export type CreatePaymentResult = {
  /** Provider-side payment identifier (e.g. a Stripe PaymentIntent id). */
  providerPaymentId: string;
  /** Secret the frontend uses to confirm the payment; null when not applicable. */
  clientSecret: string | null;
};

/**
 * Abstraction over a payment provider so the checkout flow is independent of
 * Stripe. Phase 3 adds a Stripe implementation behind this same interface.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
}
