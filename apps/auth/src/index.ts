import { serve } from '@hono/node-server';

import { authApp } from './app.js';
import { authConfig } from './config/auth.config.js';
import { prisma } from './db/prisma.client.js';

const server = serve({
  fetch: authApp.fetch,
  port: authConfig.port
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
