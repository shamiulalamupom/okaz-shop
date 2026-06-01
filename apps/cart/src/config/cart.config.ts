import { loadEnv } from '@okaz/shared';
import { z } from 'zod';

const envSchema = z.object({
  CART_REQUEST_MAX_BYTES: z.coerce.number().int().positive().default(1024),
  DATABASE_URL: z.string().url(),
  PRODUCTS_SERVICE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4003)
});

const parsed = loadEnv(envSchema, {
  ...process.env,
  PORT: process.env.CART_PORT ?? process.env.PORT
});

export const cartConfig = {
  databaseUrl: parsed.DATABASE_URL,
  productsServiceUrl: parsed.PRODUCTS_SERVICE_URL,
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  requestMaxBytes: parsed.CART_REQUEST_MAX_BYTES
};
