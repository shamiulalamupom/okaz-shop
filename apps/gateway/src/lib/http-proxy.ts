import type { Context } from 'hono';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'expect',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

const getConnectionHeaderTokens = (headers: Headers) => {
  return new Set(
    (headers.get('connection') ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
};

const buildProxyRequestHeaders = (incomingHeaders: Headers, requestId: string) => {
  const connectionHeaderTokens = getConnectionHeaderTokens(incomingHeaders);
  const headers = new Headers();

  for (const [key, value] of incomingHeaders.entries()) {
    const normalizedKey = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(normalizedKey) || connectionHeaderTokens.has(normalizedKey)) {
      continue;
    }

    headers.set(key, value);
  }

  // Never let a client forge the internal service secret through the gateway.
  headers.delete('x-internal-secret');
  headers.set('x-request-id', requestId);

  return headers;
};

const buildProxyResponseHeaders = (incomingHeaders: Headers, requestId: string) => {
  const headers = new Headers();

  for (const [key, value] of incomingHeaders.entries()) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      continue;
    }

    headers.set(key, value);
  }

  headers.set('x-request-id', requestId);

  return headers;
};

/**
 * Creates a Hono handler that proxies the incoming request to a downstream
 * microservice, preserving the path and query string. The gateway is the single
 * entry point: the frontend never talks to a microservice directly.
 */
export const createServiceProxy = (targetServiceUrl: string) => {
  return async (c: Context): Promise<Response> => {
    const requestId = c.get('requestId');
    const incomingUrl = new URL(c.req.url);
    const targetUrl = new URL(`${c.req.path}${incomingUrl.search}`, targetServiceUrl);
    const headers = buildProxyRequestHeaders(c.req.raw.headers, requestId);

    const body = ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.raw.arrayBuffer();

    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      body
    });

    return new Response(response.body, {
      status: response.status,
      headers: buildProxyResponseHeaders(response.headers, requestId)
    });
  };
};
