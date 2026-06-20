import { loadEnv } from '@okaz/shared';
import { z } from 'zod';

const envSchema = z.object({
  MEDIA_REQUEST_MAX_BYTES: z.coerce.number().int().positive().default(4096),
  DATABASE_URL: z.string().url(),
  AUTH_JWT_AUDIENCE: z.string().min(1),
  AUTH_JWT_ISSUER: z.string().min(1),
  AUTH_JWT_SECRET: z.string().min(32),
  // R2 / S3 — optional so the service can boot without credentials; presign fails
  // with a clear error until they are provided.
  R2_ENDPOINT: z.string().url().optional(),
  R2_REGION: z.string().default('auto'),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  MEDIA_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5_000_000),
  MEDIA_ALLOWED_TYPES: z.string().default('image/jpeg,image/png,image/webp'),
  MEDIA_PRESIGN_EXPIRES_SECONDS: z.coerce.number().int().positive().default(300),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4005)
});

const parsed = loadEnv(envSchema, {
  ...process.env,
  PORT: process.env.MEDIA_PORT ?? process.env.PORT
});

export const mediaConfig = {
  databaseUrl: parsed.DATABASE_URL,
  jwt: {
    audience: parsed.AUTH_JWT_AUDIENCE,
    issuer: parsed.AUTH_JWT_ISSUER,
    secret: parsed.AUTH_JWT_SECRET
  },
  r2: {
    endpoint: parsed.R2_ENDPOINT,
    region: parsed.R2_REGION,
    accessKeyId: parsed.R2_ACCESS_KEY_ID,
    secretAccessKey: parsed.R2_SECRET_ACCESS_KEY,
    bucket: parsed.R2_BUCKET,
    publicBaseUrl: parsed.R2_PUBLIC_BASE_URL
  },
  maxUploadBytes: parsed.MEDIA_MAX_UPLOAD_BYTES,
  allowedTypes: parsed.MEDIA_ALLOWED_TYPES.split(',').map((type: string) => type.trim()).filter(Boolean),
  presignExpiresSeconds: parsed.MEDIA_PRESIGN_EXPIRES_SECONDS,
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  requestMaxBytes: parsed.MEDIA_REQUEST_MAX_BYTES
};
