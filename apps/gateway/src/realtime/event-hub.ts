import type { WebSocket } from 'ws';

export type RealtimeEvent = {
  type: string;
  userId?: string;
  [key: string]: unknown;
};

type Client = {
  socket: WebSocket;
  userId: string;
};

/**
 * In-memory hub of authenticated WebSocket clients. Critical events received from
 * microservices are fanned out here to the relevant connected frontends.
 */
class EventHub {
  private readonly clients = new Set<Client>();

  add(socket: WebSocket, userId: string): Client {
    const client: Client = { socket, userId };
    this.clients.add(client);
    socket.on('close', () => this.clients.delete(client));
    return client;
  }

  remove(client: Client): void {
    this.clients.delete(client);
  }

  get size(): number {
    return this.clients.size;
  }

  /**
   * Publishes an event. When the event carries a userId, only that user's sockets
   * receive it; otherwise it is broadcast to everyone.
   */
  publish(event: RealtimeEvent): void {
    const payload = JSON.stringify(event);

    for (const client of this.clients) {
      if (event.userId && client.userId !== event.userId) {
        continue;
      }

      if (client.socket.readyState === client.socket.OPEN) {
        client.socket.send(payload);
      }
    }
  }
}

export const eventHub = new EventHub();
