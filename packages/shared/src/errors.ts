import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ApiErrorBody = {
  error: {
    code?: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
};

export const buildError = (
  message: string,
  options?: {
    code?: string;
    requestId?: string;
    details?: unknown;
  }
): ApiErrorBody => ({
  error: {
    message,
    ...(options?.code ? { code: options.code } : {}),
    ...(options?.requestId ? { requestId: options.requestId } : {}),
    ...(options?.details ? { details: options.details } : {})
  }
});

export const jsonError = (
  c: Context,
  status: ContentfulStatusCode,
  message: string,
  options?: {
    code?: string;
    details?: unknown;
  }
) => {
  const requestId = c.get('requestId');
  return c.json(
    buildError(message, {
      code: options?.code,
      requestId,
      details: options?.details
    }),
    status
  );
};
