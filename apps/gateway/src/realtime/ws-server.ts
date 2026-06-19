import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';

import { createLogger, verifyAccessToken } from '@okaz/shared';
import { WebSocketServer } from 'ws';

import { eventHub } from './event-hub.js';

const logger = createLogger('gateway-ws');

type JwtConfig = { audience: string; issuer: string; secret: string };

const WS_PATH = '/ws';

/**
 * Attaches a WebSocket server to the gateway's HTTP server. Clients connect to
 * `/ws?token=<JWT>`; the token is verified before the connection is accepted, so
 * only authenticated users receive real-time events.
 */
export const attachWebSocketServer = (server: Server, jwtConfig: JwtConfig): void => {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    let pathname: string;
    let token: string | null;

    try {
      const url = new URL(request.url ?? '', 'http://localhost');
      pathname = url.pathname;
      token = url.searchParams.get('token');
    } catch {
      socket.destroy();
      return;
    }

    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    void verifyAccessToken(token, jwtConfig)
      .then((claims) => {
        wss.handleUpgrade(request, socket, head, (ws) => {
          eventHub.add(ws, claims.sub);
          ws.send(JSON.stringify({ type: 'connection.ready', at: new Date().toISOString() }));
        });
      })
      .catch(() => {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      });
  });

  logger.info('websocket_server_ready', { path: WS_PATH });
};
