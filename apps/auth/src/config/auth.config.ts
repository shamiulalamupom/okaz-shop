import { loadEnv } from '@okaz/shared';
import { z } from 'zod';

const envSchema = z.object({
  AUTH_REQUEST_MAX_BYTES: z.coerce.number().int().positive().default(1024),
  AUTH_JWT_AUDIENCE: z.string().min(1),
  AUTH_JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3600),
  AUTH_JWT_ISSUER: z.string().min(1),
  AUTH_JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4001)
});

const parsed = loadEnv(envSchema, {
  ...process.env,
  PORT: process.env.AUTH_PORT ?? process.env.PORT
});

export const authConfig = {
  databaseUrl: parsed.DATABASE_URL,
  jwt: {
    audience: parsed.AUTH_JWT_AUDIENCE,
    expiresInSeconds: parsed.AUTH_JWT_EXPIRES_IN_SECONDS,
    issuer: parsed.AUTH_JWT_ISSUER,
    secret: parsed.AUTH_JWT_SECRET
  },
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  requestMaxBytes: parsed.AUTH_REQUEST_MAX_BYTES
};
