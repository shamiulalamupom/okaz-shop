import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Order, OrderStatus } from '../../../../core/orders/order.models';
import { OrdersService } from '../../../../core/orders/orders.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';

@Component({
  selector: 'app-order-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  private readonly realtime = inject(RealtimeService);

  private readonly orderId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly order = signal<Order | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly isCancelling = signal(false);

  constructor() {
    this.load();
    this.realtime.connect();

    effect(() => {
      const event = this.realtime.lastEvent();
      if (event && event.orderId === this.orderId && event.status) {
        untracked(() => {
          const current = this.order();
          if (current) {
            this.order.set({ ...current, status: event.status as OrderStatus });
          }
        });
      }
    });
  }

  load() {
    if (!this.orderId) {
      this.errorMessage.set('Order not found.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.ordersService
      .getOrder(this.orderId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (order) => this.order.set(order),
        error: (error) =>
          this.errorMessage.set(error?.error?.message ?? error?.error?.error ?? 'Could not load this order.'),
      });
  }

  cancel() {
    const current = this.order();
    if (!current) {
      return;
    }

    this.isCancelling.set(true);
    this.ordersService
      .cancelOrder(current.id)
      .pipe(finalize(() => this.isCancelling.set(false)))
      .subscribe({
        next: (order) => this.order.set(order),
        error: (error) =>
          this.errorMessage.set(error?.error?.message ?? error?.error?.error ?? 'Could not cancel this order.'),
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
}
