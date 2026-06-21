import { loadEnv } from '@okaz/shared';
import { z } from 'zod';

const envSchema = z.object({
  NOTIFICATIONS_REQUEST_MAX_BYTES: z.coerce.number().int().positive().default(4096),
  DATABASE_URL: z.string().url(),
  AUTH_JWT_AUDIENCE: z.string().min(1),
  AUTH_JWT_ISSUER: z.string().min(1),
  AUTH_JWT_SECRET: z.string().min(32),
  AUTH_SERVICE_URL: z.string().url(),
  INTERNAL_SERVICE_SECRET: z.string().min(16),
  EVENTS_SINK_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4006)
});

const parsed = loadEnv(envSchema, {
  ...process.env,
  PORT: process.env.NOTIFICATIONS_PORT ?? process.env.PORT
});

export const notificationsConfig = {
  databaseUrl: parsed.DATABASE_URL,
  jwt: {
    audience: parsed.AUTH_JWT_AUDIENCE,
    issuer: parsed.AUTH_JWT_ISSUER,
    secret: parsed.AUTH_JWT_SECRET
  },
  authServiceUrl: parsed.AUTH_SERVICE_URL,
  internalServiceSecret: parsed.INTERNAL_SERVICE_SECRET,
  eventsSinkUrl: parsed.EVENTS_SINK_URL,
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  requestMaxBytes: parsed.NOTIFICATIONS_REQUEST_MAX_BYTES
};
