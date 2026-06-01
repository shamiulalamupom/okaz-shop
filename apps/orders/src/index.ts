import { serve } from '@hono/node-server';

import { ordersApp } from './app.js';
import { ordersConfig } from './config/orders.config.js';
import { prisma } from './db/prisma.client.js';

const server = serve({
  fetch: ordersApp.fetch,
  port: ordersConfig.port
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
