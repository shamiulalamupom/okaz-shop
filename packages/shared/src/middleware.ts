import { randomUUID } from 'node:crypto';

import type { MiddlewareHandler } from 'hono';

import type { Logger } from './logger.js';

export const correlationIdMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const incoming = c.req.header('x-request-id');
    const requestId = incoming && incoming.length > 0 ? incoming : randomUUID();

    c.set('requestId', requestId);
    c.header('X-Request-Id', requestId);

    await next();
  };
};

const resolveForwardedIp = (headerValue?: string) => {
  if (!headerValue) {
    return undefined;
  }

  return headerValue.split(',')[0]?.trim() || undefined;
};

export const requestLoggerMiddleware = (logger: Logger): MiddlewareHandler => {
  return async (c, next) => {
    const startedAt = Date.now();

    try {
      await next();
    } finally {
      const latencyMs = Date.now() - startedAt;
      const requestId = c.get('requestId') ?? 'unknown';
      const ip =
        resolveForwardedIp(c.req.header('x-forwarded-for')) ||
        c.req.header('x-real-ip') ||
        c.req.header('cf-connecting-ip') ||
        'unknown';

      logger.info('request', {
        ip,
        latencyMs,
        method: c.req.method,
        path: c.req.path,
        requestId,
        status: c.res.status
      });
    }
  };
};
