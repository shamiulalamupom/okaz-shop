import type { Context } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { z } from 'zod';

import { jsonError } from './errors.js';

type ParsedJsonBodyResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      response: Response;
    };

const parseContentLength = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

export const createContentLengthLimitMiddleware = (maxBytes: number): MiddlewareHandler => {
  return async (c, next) => {
    const contentLength = parseContentLength(c.req.header('content-length'));

    if (contentLength !== null && contentLength > maxBytes) {
      return jsonError(c, 413, 'Payload too large', {
        code: 'PAYLOAD_TOO_LARGE',
        details: { maxBytes }
      });
    }

    await next();
  };
};

export const parseJsonBody = async <T extends z.ZodTypeAny>(
  c: Context,
  schema: T,
  options?: {
    maxBytes?: number;
  }
): Promise<ParsedJsonBodyResult<z.infer<T>>> => {
  const rawBody = await c.req.text().catch(() => null);

  if (rawBody === null) {
    return {
      success: false,
      response: jsonError(c, 400, 'Invalid request body', {
        code: 'VALIDATION_ERROR',
        details: {
          formErrors: ['Expected object, received null'],
          fieldErrors: {}
        }
      })
    };
  }

  if (options?.maxBytes && Buffer.byteLength(rawBody, 'utf8') > options.maxBytes) {
    return {
      success: false,
      response: jsonError(c, 413, 'Payload too large', {
        code: 'PAYLOAD_TOO_LARGE',
        details: { maxBytes: options.maxBytes }
      })
    };
  }

  let payload: unknown = null;

  if (rawBody.length > 0) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = null;
    }
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      response: jsonError(c, 400, 'Invalid request body', {
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten()
      })
    };
  }

  return {
    success: true,
    data: parsed.data
  };
};
