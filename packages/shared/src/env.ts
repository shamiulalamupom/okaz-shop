import { z } from 'zod';

export const loadEnv = <T extends z.ZodTypeAny>(schema: T, source: Record<string, unknown> = process.env) => {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${errors}`);
  }

  return parsed.data;
};
