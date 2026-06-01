import { serve } from '@hono/node-server';

import { gatewayApp } from './app.js';
import { gatewayConfig } from './config/gateway.config.js';

const server = serve({
  fetch: gatewayApp.fetch,
  port: gatewayConfig.port
});

const shutdown = async () => {
  server.close();
};

process.on('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});
