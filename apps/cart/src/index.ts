import { serve } from '@hono/node-server';

import { cartApp } from './app.js';
import { cartConfig } from './config/cart.config.js';
import { prisma } from './db/prisma.client.js';

const server = serve({
  fetch: cartApp.fetch,
  port: cartConfig.port
});

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
};

process.on('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});
