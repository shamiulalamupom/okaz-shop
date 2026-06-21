import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AppNotification } from '../../core/notifications/notification.models';
import { NotificationsStore } from '../../core/notifications/notifications.store';

@Component({
  selector: 'app-notifications-bell',
  imports: [DatePipe],
  templateUrl: './notifications-bell.component.html',
})
export class NotificationsBellComponent {
  private readonly store = inject(NotificationsStore);
  private readonly router = inject(Router);

  readonly notifications = this.store.notifications;
  readonly unreadCount = this.store.unreadCount;
  readonly open = signal(false);

  toggle() {
    this.open.update((value) => !value);
  }

  close() {
    this.open.set(false);
  }

  onSelect(notification: AppNotification) {
    this.store.markRead(notification.id);
    this.close();
    if (notification.orderId) {
      this.router.navigate(['/orders', notification.orderId]);
    }
  }

  markAllRead() {
    this.store.markAllRead();
  }
}
