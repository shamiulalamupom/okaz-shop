import { serve } from '@hono/node-server';

import { notificationsApp } from './app.js';
import { notificationsConfig } from './config/notifications.config.js';
import { prisma } from './db/prisma.client.js';

const server = serve({
  fetch: notificationsApp.fetch,
  port: notificationsConfig.port
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
