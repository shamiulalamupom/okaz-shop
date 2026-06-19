import { serve } from '@hono/node-server';
import type { Server } from 'node:http';

import { gatewayApp } from './app.js';
import { gatewayConfig } from './config/gateway.config.js';
import { attachWebSocketServer } from './realtime/ws-server.js';

const server = serve({
  fetch: gatewayApp.fetch,
  port: gatewayConfig.port
});

attachWebSocketServer(server as Server, gatewayConfig.jwt);

const shutdown = async () => {
  server.close();
};

process.on('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});
