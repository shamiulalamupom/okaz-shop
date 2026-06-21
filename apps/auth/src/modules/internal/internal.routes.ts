import { Hono } from 'hono';

import { authConfig } from '../../config/auth.config.js';
import { internalSecretMiddleware } from '../../middleware/internal-secret.middleware.js';
import { internalService } from './internal.service.js';

/**
 * Internal service-to-service routes (not exposed through the gateway). The
 * notifications service calls /internal/staff to fan out "order placed" alerts.
 */
const internalRoutes = new Hono();

internalRoutes.use('*', internalSecretMiddleware(authConfig.internalServiceSecret));

internalRoutes.get('/staff', async (c) => {
  const staff = await internalService.listStaff();
  return c.json({ data: staff }, 200);
});

export { internalRoutes };
