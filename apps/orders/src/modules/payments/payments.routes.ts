import { Hono } from 'hono';

import { stripeWebhookController } from './payments.controller.js';

const paymentsRoutes = new Hono();

// Public: no user-context middleware. Authenticated by Stripe signature.
paymentsRoutes.post('/webhook', stripeWebhookController);

export { paymentsRoutes };
