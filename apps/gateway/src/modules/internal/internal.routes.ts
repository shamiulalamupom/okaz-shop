import { parseJsonBody } from '@okaz/shared';
import { Hono } from 'hono';
import { z } from 'zod';

import { internalSecretMiddleware } from '../../middleware/internal-secret.middleware.js';
import { eventHub } from '../../realtime/event-hub.js';

const eventSchema = z
  .object({
    type: z.string().min(1),
    userId: z.string().optional()
  })
  .passthrough();

/**
 * Internal event ingestion endpoint. Microservices POST critical events here and
 * the gateway fans them out to connected frontends over WebSocket.
 */
export const createInternalRoutes = (internalSecret: string) => {
  const routes = new Hono();

  routes.use('/*', internalSecretMiddleware(internalSecret));

  routes.post('/events', async (c) => {
    const parsed = await parseJsonBody(c, eventSchema, { maxBytes: 4096 });
    if (!parsed.success) {
      return parsed.response;
    }

    eventHub.publish(parsed.data);
    return c.json({ delivered: true, clients: eventHub.size }, 202);
  });

  return routes;
};
