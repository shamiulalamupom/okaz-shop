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

  headers.set('x-request-id', requestId);

  return headers;
};

const buildProxyResponseHeaders = (incomingHeaders: Headers, requestId: string) => {
  const headers = new Headers();

  for (const [key, value] of incomingHeaders.entries()) {
    const normalizedKey = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      continue;
    }

    headers.set(key, value);
  }

  headers.set('x-request-id', requestId);

  return headers;
};

export const createAuthProxyService = (authServiceUrl: string) => {
  return {
    async proxyRequest(c: Context) {
      const requestId = c.get('requestId');
      const incomingUrl = new URL(c.req.url);
      const targetUrl = new URL(`${c.req.path}${incomingUrl.search}`, authServiceUrl);
      const headers = buildProxyRequestHeaders(c.req.raw.headers, requestId);

      const body = ['GET', 'HEAD'].includes(c.req.method) ? undefined : await c.req.raw.arrayBuffer();

      const response = await fetch(targetUrl, {
        method: c.req.method,
        headers,
        body
      });

      const responseHeaders = buildProxyResponseHeaders(response.headers, requestId);

      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders
      });
    }
  };
};
