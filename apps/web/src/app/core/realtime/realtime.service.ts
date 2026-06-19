import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface OrderEvent {
  type: string;
  orderId?: string;
  userId?: string;
  status?: string;
  total?: number;
  at?: string;
}

/**
 * Maintains a WebSocket connection to the gateway and exposes the latest order
 * event as a signal, so order screens can update in real time.
 */
@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(AuthService);
  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  readonly connected = signal(false);
  readonly lastEvent = signal<OrderEvent | null>(null);

  private get wsUrl(): string {
    return environment.apiUrl.replace(/^http/, 'ws') + '/ws';
  }

  connect() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const token = this.auth.token();
    if (!token) {
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.socket = new WebSocket(`${this.wsUrl}?token=${encodeURIComponent(token)}`);

    this.socket.onopen = () => this.connected.set(true);

    this.socket.onmessage = (message) => {
      try {
        this.lastEvent.set(JSON.parse(message.data) as OrderEvent);
      } catch {
        /* ignore malformed frames */
      }
    };

    this.socket.onclose = () => {
      this.connected.set(false);
      this.scheduleReconnect();
    };

    this.socket.onerror = () => this.socket?.close();
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.socket?.close();
    this.socket = undefined;
    this.connected.set(false);
  }

  private scheduleReconnect() {
    if (!isPlatformBrowser(this.platformId) || !this.auth.token() || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, 3000);
  }
}
