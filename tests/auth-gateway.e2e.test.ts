import { request as httpRequest } from 'node:http';

import { beforeAll, describe, expect, it } from 'vitest';

const baseUrl = process.env.TEST_GATEWAY_URL ?? 'http://localhost:4000';
const adminEmail = process.env.ADMIN_SEED_EMAIL ?? 'admin@example.com';
const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'Admin1234!';
let ipCounter = 1;

const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const nextTestIp = () => `198.51.100.${ipCounter++}`;

const waitForReady = async () => {
  const maxAttempts = 60;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/ready`);
      if (response.ok) {
        return;
      }
    } catch {
      // ignored
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Gateway is not ready at ${baseUrl}/ready`);
};

const register = async (email: string, password: string) => {
  return fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': nextTestIp()
    },
    body: JSON.stringify({ email, password })
  });
};

const login = async (email: string, password: string) => {
  return fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': nextTestIp()
    },
    body: JSON.stringify({ email, password })
  });
};

const postJson = async (path: string, payload: unknown) => {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': nextTestIp()
    },
    body: JSON.stringify(payload)
  });
};

const postRawJson = async (path: string, rawBody: string) => {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': nextTestIp()
    },
    body: rawBody
  });
};

const postWithExpectContinue = async (path: string, payload: { email: string; password: string }) => {
  const body = JSON.stringify(payload);
  const url = new URL(path, baseUrl);

  return new Promise<{ body: unknown; status: number }>((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          Connection: 'Keep-Alive',
          'Content-Length': Buffer.byteLength(body),
          'Content-Type': 'application/json',
          Expect: '100-continue',
          'X-Forwarded-For': nextTestIp()
        }
      },
      (response) => {
        let responseBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          const parsedBody = responseBody.length > 0 ? JSON.parse(responseBody) : null;

          resolve({
            body: parsedBody,
            status: response.statusCode ?? 0
          });
        });
      }
    );

    request.on('continue', () => {
      request.write(body);
      request.end();
    });
    request.on('error', reject);
    request.flushHeaders();
  });
};

beforeAll(async () => {
  await waitForReady();
});

describe('auth + gateway e2e', () => {
  it('register + login success', async () => {
    const email = uniqueEmail('register-login-success');
    const password = 'Password123';

    const registerResponse = await register(email, password);
    expect(registerResponse.status).toBe(201);

    const registerBody = (await registerResponse.json()) as {
      email: string;
      id: string;
      roles: string[];
    };
    expect(registerBody.email).toBe(email.toLowerCase());
    expect(registerBody.roles).toEqual(['CUSTOMER']);

    const loginResponse = await login(email, password);
    expect(loginResponse.status).toBe(200);

    const loginBody = (await loginResponse.json()) as {
      accessToken: string;
      user: {
        email: string;
        id: string;
        roles: string[];
      };
    };

    expect(loginBody.accessToken).toBeTypeOf('string');
    expect(loginBody.user.email).toBe(email.toLowerCase());
    expect(loginBody.user.roles).toEqual(['CUSTOMER']);
  });

  it('login failure with wrong password returns 401 + generic message', async () => {
    const email = uniqueEmail('login-fail');
    const password = 'Password123';

    const registerResponse = await register(email, password);
    expect(registerResponse.status).toBe(201);

    const loginResponse = await login(email, 'WrongPass123');
    expect(loginResponse.status).toBe(401);

    const body = (await loginResponse.json()) as { message: string };
    expect(body).toEqual({ message: 'Invalid credentials' });
  });

  it('register rejects unknown fields such as role injection', async () => {
    const response = await postJson('/auth/register', {
      email: uniqueEmail('register-strict'),
      password: 'Password123',
      role: 'ADMIN',
      roles: ['ADMIN']
    });

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      error: {
        code: string;
        details: {
          formErrors: string[];
        };
      };
    };

    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.formErrors.some((error) => error.includes('Unrecognized key'))).toBe(true);
  });

  it('login rejects unknown fields', async () => {
    const email = uniqueEmail('login-strict');
    const password = 'Password123';

    const registerResponse = await register(email, password);
    expect(registerResponse.status).toBe(201);

    const response = await postJson('/auth/login', {
      email,
      password,
      rememberMe: true
    });

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      error: {
        code: string;
        details: {
          formErrors: string[];
        };
      };
    };

    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.formErrors.some((error) => error.includes('Unrecognized key'))).toBe(true);
  });

  it('register rejects oversized payloads', async () => {
    const response = await postRawJson(
      '/auth/register',
      JSON.stringify({
        email: uniqueEmail('oversized-register'),
        password: `Password${'1'.repeat(2048)}`
      })
    );

    expect(response.status).toBe(413);

    const body = (await response.json()) as {
      error: {
        code: string;
      };
    };

    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('gateway protected route returns 401 without token', async () => {
    const response = await fetch(`${baseUrl}/protected`);
    expect(response.status).toBe(401);
  });

  it('gateway protected route returns 200 with token', async () => {
    const email = uniqueEmail('protected-ok');
    const password = 'Password123';

    const registerResponse = await register(email, password);
    expect(registerResponse.status).toBe(201);

    const loginResponse = await login(email, password);
    expect(loginResponse.status).toBe(200);

    const loginBody = (await loginResponse.json()) as { accessToken: string };

    const protectedResponse = await fetch(`${baseUrl}/protected`, {
      headers: {
        Authorization: `Bearer ${loginBody.accessToken}`
      }
    });

    expect(protectedResponse.status).toBe(200);
  });

  it('/admin returns 403 for non-admin token, 200 for admin token', async () => {
    const email = uniqueEmail('non-admin');
    const password = 'Password123';

    const registerResponse = await register(email, password);
    expect(registerResponse.status).toBe(201);

    const nonAdminLoginResponse = await login(email, password);
    expect(nonAdminLoginResponse.status).toBe(200);
    const nonAdminLoginBody = (await nonAdminLoginResponse.json()) as { accessToken: string };

    const nonAdminResponse = await fetch(`${baseUrl}/admin`, {
      headers: {
        Authorization: `Bearer ${nonAdminLoginBody.accessToken}`
      }
    });
    expect(nonAdminResponse.status).toBe(403);

    const adminLoginResponse = await login(adminEmail, adminPassword);
    expect(adminLoginResponse.status).toBe(200);
    const adminLoginBody = (await adminLoginResponse.json()) as { accessToken: string };

    const adminResponse = await fetch(`${baseUrl}/admin`, {
      headers: {
        Authorization: `Bearer ${adminLoginBody.accessToken}`
      }
    });

    expect(adminResponse.status).toBe(200);
  });

  it('gateway proxies PowerShell-style expect-continue auth requests', async () => {
    const email = uniqueEmail('expect-continue');
    const password = 'Password123';

    const registerResponse = await postWithExpectContinue('/auth/register', { email, password });
    expect(registerResponse.status).toBe(201);

    const registerBody = registerResponse.body as {
      email: string;
      roles: string[];
    };
    expect(registerBody.email).toBe(email.toLowerCase());
    expect(registerBody.roles).toEqual(['CUSTOMER']);

    const loginResponse = await postWithExpectContinue('/auth/login', { email, password });
    expect(loginResponse.status).toBe(200);

    const loginBody = loginResponse.body as {
      accessToken: string;
      user: {
        email: string;
      };
    };
    expect(loginBody.accessToken).toBeTypeOf('string');
    expect(loginBody.user.email).toBe(email.toLowerCase());
  });
});
