import { parseJsonBody } from '@okaz/shared';
import type { Context } from 'hono';

import { authConfig } from '../../config/auth.config.js';
import { authService, isUniqueConstraintError } from './auth.service.js';
import { loginRequestSchema, registerRequestSchema } from './auth.schemas.js';

export const registerController = async (c: Context) => {
  const parsed = await parseJsonBody(c, registerRequestSchema, {
    maxBytes: authConfig.requestMaxBytes
  });

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const user = await authService.register(parsed.data);
    return c.json(user, 201);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return c.json({ message: 'Email already registered' }, 409);
    }

    throw error;
  }
};

export const loginController = async (c: Context) => {
  const parsed = await parseJsonBody(c, loginRequestSchema, {
    maxBytes: authConfig.requestMaxBytes
  });

  if (!parsed.success) {
    return parsed.response;
  }

  const loginResult = await authService.login(parsed.data);

  if (!loginResult) {
    return c.json({ message: 'Invalid credentials' }, 401);
  }

  return c.json(loginResult, 200);
};

export const meController = async (c: Context) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    email: user.email,
    roles: user.roles
  });
};
