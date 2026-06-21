import WebSocket from 'ws';

import { testConfig } from './config.js';

export const baseUrl = testConfig.gatewayUrl;
export const wsUrl = `${baseUrl.replace(/^http/, 'ws')}/ws`;
export const adminEmail = testConfig.adminEmail;
export const adminPassword = testConfig.adminPassword;

// A random forwarded IP per request keeps the gateway login rate-limiter from
// interfering with the test suite (test files run in separate workers, so a
// shared counter would collide across files on the per-IP login limit).
const octet = () => Math.floor(Math.random() * 254) + 1;
const nextIp = () => `10.${octet()}.${octet()}.${octet()}`;

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
export const uniqueName = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export interface ApiResult<T = unknown> {
  status: number;
  body: T;
}

export const api = async <T = unknown>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<ApiResult<T>> => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      'X-Forwarded-For': nextIp(),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: response.status, body: body as T };
};

export const waitForReady = async () => {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/ready`);
      if (response.ok) {
        return;
      }
    } catch {
      // not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Gateway is not ready at ${baseUrl}/ready`);
};

export interface TestUser {
  email: string;
  password: string;
  token: string;
  userId: string;
}

/** Registers a fresh CUSTOMER and returns a logged-in session. */
export const registerCustomer = async (prefix = 'customer'): Promise<TestUser> => {
  const email = uniqueEmail(prefix);
  const password = 'Password123';

  const register = await api('/auth/register', { method: 'POST', body: { email, password } });
  if (register.status !== 201) {
    throw new Error(`register failed: ${register.status} ${JSON.stringify(register.body)}`);
  }

  const login = await api<{ accessToken: string; user: { id: string } }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (login.status !== 200) {
    throw new Error(`login failed: ${login.status}`);
  }

  return { email, password, token: login.body.accessToken, userId: login.body.user.id };
};

/** Logs in the seeded admin (admin@example.com). Requires `prisma:seed` to have run. */
export const loginAdmin = async (): Promise<string> => {
  const login = await api<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  });
  if (login.status !== 200) {
    throw new Error(
      `admin login failed (${login.status}). Seed the admin: docker compose exec auth pnpm prisma:seed`,
    );
  }
  return login.body.accessToken;
};

export interface Store {
  id: string;
  name: string;
  city?: string | null;
}

export const getStores = async (token: string): Promise<Store[]> => {
  const result = await api<{ data: Store[] }>('/stores', { token });
  return result.body.data ?? [];
};

/** Creates a product as the given (manager/admin) token. Returns the created id. */
export const createProduct = async (
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<string> => {
  const result = await api<{ data: { _id: string } }>('/products', {
    method: 'POST',
    token,
    body: { name: uniqueName('Test Product'), price: 9.99, category: 'Test', ...overrides },
  });
  if (result.status !== 201) {
    throw new Error(`createProduct failed: ${result.status} ${JSON.stringify(result.body)}`);
  }
  return result.body.data._id;
};

export const setStock = (token: string, productId: string, storeId: string, quantity: number) =>
  api('/stocks', { method: 'POST', token, body: { productId, storeId, quantity } });

export interface OrderItemInput {
  productId: string;
  storeId: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'CANCELLED' | 'DELIVERED';
  total: number;
  reason: string | null;
  items: OrderItemInput[];
}

export const placeOrder = (
  token: string,
  items: OrderItemInput[],
  shippingAddress = '1 Test Street, 75001 Paris, France',
) => api<Order>('/orders', { method: 'POST', token, body: { items, shippingAddress } });

/** Marks a validated order delivered (staff only). */
export const deliverOrder = (token: string, orderId: string) =>
  api<Order>(`/orders/${orderId}/deliver`, { method: 'POST', token });

export interface Notification {
  id: string;
  type: 'ORDER_PLACED' | 'ORDER_VALIDATED' | 'ORDER_REJECTED' | 'ORDER_DELIVERED';
  title: string;
  body: string;
  orderId: string | null;
  read: boolean;
  createdAt: string;
}

export const getNotifications = async (token: string): Promise<Notification[]> => {
  const result = await api<{ data: Notification[] }>('/notifications', { token });
  return result.body.data ?? [];
};

export const getUnreadCount = async (token: string): Promise<number> => {
  const result = await api<{ count: number }>('/notifications/unread-count', { token });
  return result.body.count ?? 0;
};

/** Polls the recipient's feed until a notification matching `predicate` appears. */
export const waitForNotification = async (
  token: string,
  predicate: (notification: Notification) => boolean,
  timeoutMs = 8000,
): Promise<Notification> => {
  const deadline = Date.now() + timeoutMs;
  let last: Notification[] = [];
  while (Date.now() < deadline) {
    last = await getNotifications(token);
    const match = last.find(predicate);
    if (match) {
      return match;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for a matching notification. Last feed: ${JSON.stringify(last)}`);
};

/** Opens a WebSocket to the gateway with the given token. */
export const openSocket = (token?: string): WebSocket =>
  new WebSocket(token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl);

/** Resolves with the first JSON message matching `predicate`, or rejects on timeout. */
export const waitForMessage = <T = Record<string, unknown>>(
  socket: WebSocket,
  predicate: (event: T) => boolean,
  timeoutMs = 8000,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timed out waiting for matching WebSocket message'));
    }, timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const parsed = JSON.parse(raw.toString()) as T;
        if (predicate(parsed)) {
          clearTimeout(timer);
          socket.off('message', onMessage);
          resolve(parsed);
        }
      } catch {
        // ignore non-JSON frames
      }
    };

    socket.on('message', onMessage);
  });

export const closeSocket = (socket: WebSocket) => {
  if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
    socket.close();
  }
};
