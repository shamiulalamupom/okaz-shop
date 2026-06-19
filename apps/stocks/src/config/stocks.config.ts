import { loadEnv } from '@okaz/shared';
import { z } from 'zod';

const envSchema = z.object({
  STOCKS_REQUEST_MAX_BYTES: z.coerce.number().int().positive().default(4096),
  DATABASE_URL: z.string().url(),
  INTERNAL_SERVICE_SECRET: z.string().min(16),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4003)
});

const parsed = loadEnv(envSchema, {
  ...process.env,
  PORT: process.env.STOCKS_PORT ?? process.env.PORT
});

export const stocksConfig = {
  databaseUrl: parsed.DATABASE_URL,
  internalServiceSecret: parsed.INTERNAL_SERVICE_SECRET,
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  requestMaxBytes: parsed.STOCKS_REQUEST_MAX_BYTES
};
