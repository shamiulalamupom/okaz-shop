import { loadEnv } from '@okaz/shared';
import { z } from 'zod';

const envSchema = z.object({
  ORDERS_REQUEST_MAX_BYTES: z.coerce.number().int().positive().default(8192),
  DATABASE_URL: z.string().url(),
  AUTH_JWT_AUDIENCE: z.string().min(1),
  AUTH_JWT_ISSUER: z.string().min(1),
  AUTH_JWT_SECRET: z.string().min(32),
  PRODUCTS_SERVICE_URL: z.string().url(),
  STOCKS_SERVICE_URL: z.string().url(),
  INTERNAL_SERVICE_SECRET: z.string().min(16),
  EVENTS_SINK_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4004)
});

const parsed = loadEnv(envSchema, {
  ...process.env,
  PORT: process.env.ORDERS_PORT ?? process.env.PORT
});

export const ordersConfig = {
  databaseUrl: parsed.DATABASE_URL,
  jwt: {
    audience: parsed.AUTH_JWT_AUDIENCE,
    issuer: parsed.AUTH_JWT_ISSUER,
    secret: parsed.AUTH_JWT_SECRET
  },
  productsServiceUrl: parsed.PRODUCTS_SERVICE_URL,
  stocksServiceUrl: parsed.STOCKS_SERVICE_URL,
  internalServiceSecret: parsed.INTERNAL_SERVICE_SECRET,
  eventsSinkUrl: parsed.EVENTS_SINK_URL,
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  requestMaxBytes: parsed.ORDERS_REQUEST_MAX_BYTES
};
