import { loadEnv } from '@okaz/shared';
import { z } from 'zod';

const envSchema = z.object({
  ORDERS_REQUEST_MAX_BYTES: z.coerce.number().int().positive().default(1024),
  DATABASE_URL: z.string().url(),
  CART_SERVICE_URL: z.string().url(),
  PRODUCTS_SERVICE_URL: z.string().url(),
  PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
  DEFAULT_CURRENCY: z.string().min(1).default('usd'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4004)
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
  defaultCurrency: parsed.DEFAULT_CURRENCY,
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  requestMaxBytes: parsed.ORDERS_REQUEST_MAX_BYTES
};
