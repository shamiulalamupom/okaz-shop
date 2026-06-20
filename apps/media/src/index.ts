import { serve } from '@hono/node-server';

import { mediaApp } from './app.js';
import { mediaConfig } from './config/media.config.js';
import { prisma } from './db/prisma.client.js';

const server = serve({
  fetch: mediaApp.fetch,
  port: mediaConfig.port
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
