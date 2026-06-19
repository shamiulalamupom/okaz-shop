import { serve } from '@hono/node-server';

import { stocksApp } from './app.js';
import { stocksConfig } from './config/stocks.config.js';
import { prisma } from './db/prisma.client.js';

const server = serve({
  fetch: stocksApp.fetch,
  port: stocksConfig.port
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
