import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AppNotification } from './notification.models';
import { NotificationsService } from './notifications.service';

/**
 * Holds the authenticated user's notification feed. Loads on sign-in, refreshes
 * live whenever a `notification.new` event arrives over the WebSocket, and exposes
 * an unread count for the header bell.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationsStore {
  private readonly api = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);

  constructor() {
    // Load (or clear) the feed as the auth state changes, and keep the socket open.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.realtime.connect();
        untracked(() => this.load());
      } else {
        untracked(() => this.notifications.set([]));
      }
    });

    // Refresh when the gateway pushes a new-notification signal for this user.
    effect(() => {
      const event = this.realtime.lastEvent();
      if (event?.type === 'notification.new') {
        untracked(() => this.load());
      }
    });
  }

  load() {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    this.api.list().subscribe({
      next: (notifications) => this.notifications.set(notifications),
      error: () => {
        /* best-effort; leave the existing feed in place */
      },
    });
  }

  markRead(id: string) {
    const target = this.notifications().find((n) => n.id === id);
    if (!target || target.read) {
      return;
    }
    // Optimistic update.
    this.notifications.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    this.api.markRead(id).subscribe({ error: () => this.load() });
  }

  markAllRead() {
    if (this.unreadCount() === 0) {
      return;
    }
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
    this.api.markAllRead().subscribe({ error: () => this.load() });
  }
}
