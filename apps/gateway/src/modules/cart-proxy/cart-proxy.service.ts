import type { UserContext } from '@okaz/shared';
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

// Identity headers are set by the gateway only. Any client-supplied copies are
// stripped before forwarding so they cannot be spoofed.
const IDENTITY_HEADERS = new Set(['x-user-id', 'x-user-email', 'x-user-roles']);

const getConnectionHeaderTokens = (headers: Headers) => {
  return new Set(
    (headers.get('connection') ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
};

const buildProxyRequestHeaders = (incomingHeaders: Headers, requestId: string, user: UserContext) => {
  const connectionHeaderTokens = getConnectionHeaderTokens(incomingHeaders);
  const headers = new Headers();

  for (const [key, value] of incomingHeaders.entries()) {
    const normalizedKey = key.toLowerCase();

    if (
      HOP_BY_HOP_HEADERS.has(normalizedKey) ||
      connectionHeaderTokens.has(normalizedKey) ||
      IDENTITY_HEADERS.has(normalizedKey)
    ) {
      continue;
    }

    headers.set(key, value);
  }

  headers.set('x-request-id', requestId);
  headers.set('x-user-id', user.id);
  headers.set('x-user-email', user.email);
  headers.set('x-user-roles', user.roles.join(','));

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

export const createCartProxyService = (cartServiceUrl: string) => {
  return {
    async proxyRequest(c: Context) {
      const requestId = c.get('requestId');
      const user = c.get('user');
      const incomingUrl = new URL(c.req.url);
      const targetUrl = new URL(`${c.req.path}${incomingUrl.search}`, cartServiceUrl);
      const headers = buildProxyRequestHeaders(c.req.raw.headers, requestId, user);

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
