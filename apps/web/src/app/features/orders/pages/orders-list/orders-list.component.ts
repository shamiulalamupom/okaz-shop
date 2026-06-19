import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Order, OrderStatus } from '../../../../core/orders/order.models';
import { OrdersService } from '../../../../core/orders/orders.service';
import { OrderEvent, RealtimeService } from '../../../../core/realtime/realtime.service';

@Component({
  selector: 'app-orders-list',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './orders-list.component.html',
})
export class OrdersListComponent {
  private readonly ordersService = inject(OrdersService);
  private readonly realtime = inject(RealtimeService);

  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly liveConnected = this.realtime.connected;

  constructor() {
    this.load();
    this.realtime.connect();

    // Live-update the list whenever an order event arrives over WebSocket.
    effect(() => {
      const event = this.realtime.lastEvent();
      if (event && event.type?.startsWith('order.')) {
        untracked(() => this.applyEvent(event));
      }
    });
  }

  load() {
    this.isLoading.set(true);
    this.ordersService
      .getOrders()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (orders) => this.orders.set(orders),
        error: (error) =>
          this.errorMessage.set(error?.error?.message ?? error?.error?.error ?? 'Could not load your orders.'),
      });
  }

  statusClass(status: OrderStatus): string {
    switch (status) {
      case 'VALIDATED':
        return 'bg-primary/15 text-primary';
      case 'REJECTED':
        return 'bg-destructive/10 text-destructive';
      case 'CANCELLED':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  }

  private applyEvent(event: OrderEvent) {
    const orders = this.orders();
    const index = orders.findIndex((order) => order.id === event.orderId);

    if (index >= 0 && event.status) {
      const next = [...orders];
      next[index] = { ...next[index], status: event.status as OrderStatus };
      this.orders.set(next);
    } else if (event.type === 'order.created') {
      // A brand-new order we don't have yet — refresh from the server.
      this.load();
    }
  }
}
