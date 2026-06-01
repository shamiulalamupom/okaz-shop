import { loadEnv } from '@okaz/shared';
import { z } from 'zod';

const envSchema = z
  .object({
    ORDERS_REQUEST_MAX_BYTES: z.coerce.number().int().positive().default(1024),
    DATABASE_URL: z.string().url(),
    CART_SERVICE_URL: z.string().url(),
    PRODUCTS_SERVICE_URL: z.string().url(),
    PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    DEFAULT_CURRENCY: z.string().min(1).default('usd'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4004)
  })
  .superRefine((value, ctx) => {
    if (value.PAYMENT_PROVIDER === 'stripe') {
      if (!value.STRIPE_SECRET_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STRIPE_SECRET_KEY'],
          message: 'STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe'
        });
      }
      if (!value.STRIPE_WEBHOOK_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['STRIPE_WEBHOOK_SECRET'],
          message: 'STRIPE_WEBHOOK_SECRET is required when PAYMENT_PROVIDER=stripe'
        });
      }
    }
  });

const parsed = loadEnv(envSchema, {
  ...process.env,
  PORT: process.env.ORDERS_PORT ?? process.env.PORT
});

export const ordersConfig = {
  databaseUrl: parsed.DATABASE_URL,
  cartServiceUrl: parsed.CART_SERVICE_URL,
  productsServiceUrl: parsed.PRODUCTS_SERVICE_URL,
  paymentProvider: parsed.PAYMENT_PROVIDER,
  stripeSecretKey: parsed.STRIPE_SECRET_KEY,
  stripeWebhookSecret: parsed.STRIPE_WEBHOOK_SECRET,
  defaultCurrency: parsed.DEFAULT_CURRENCY,
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  requestMaxBytes: parsed.ORDERS_REQUEST_MAX_BYTES
};
