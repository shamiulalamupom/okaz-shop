import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Order, OrderStatus } from '../../../../core/orders/order.models';
import { OrdersService } from '../../../../core/orders/orders.service';
import { ProductsService } from '../../../../core/products/products.service';

@Component({
  selector: 'app-admin-orders',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './admin-orders.component.html',
})
export class AdminOrdersComponent {
  private readonly ordersService = inject(OrdersService);
  private readonly productsService = inject(ProductsService);

  readonly orders = signal<Order[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly validatingId = signal<string | null>(null);
  readonly deliveringId = signal<string | null>(null);
  private readonly productNames = signal<Record<string, string>>({});

  constructor() {
    this.load();
    this.productsService.getProducts().subscribe({
      next: (products) =>
        this.productNames.set(Object.fromEntries(products.map((p) => [p._id, p.name]))),
      error: () => {
        /* names are best-effort */
      },
    });
  }

  customerLabel(order: Order): string {
    return order.userEmail ?? `customer #${order.userId.slice(-8)}`;
  }

  itemsSummary(order: Order): string {
    return order.items
      .map((line) => `${this.productNames()[line.productId] ?? `#${line.productId.slice(-6)}`} ×${line.quantity}`)
      .join(', ');
  }

  load() {
    this.isLoading.set(true);
    this.ordersService
      .getAllOrders()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (orders) => this.orders.set(orders),
        error: (error) =>
          this.errorMessage.set(error?.error?.message ?? error?.error?.error ?? 'Could not load orders.'),
      });
  }

  validate(id: string) {
    this.validatingId.set(id);
    this.ordersService
      .validateOrder(id)
      .pipe(finalize(() => this.validatingId.set(null)))
      .subscribe({
        next: (updated) => this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o))),
        error: (error) =>
          this.errorMessage.set(error?.error?.message ?? error?.error?.error ?? 'Could not validate the order.'),
      });
  }

  deliver(id: string) {
    this.deliveringId.set(id);
    this.ordersService
      .deliverOrder(id)
      .pipe(finalize(() => this.deliveringId.set(null)))
      .subscribe({
        next: (updated) => this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o))),
        error: (error) =>
          this.errorMessage.set(error?.error?.message ?? error?.error?.error ?? 'Could not mark the order delivered.'),
      });
  }

  canValidate(order: Order): boolean {
    return order.status === 'PENDING' || order.status === 'REJECTED';
  }

  canDeliver(order: Order): boolean {
    return order.status === 'VALIDATED';
  }

  statusClass(status: OrderStatus): string {
    switch (status) {
      case 'VALIDATED':
        return 'bg-primary/15 text-primary';
      case 'DELIVERED':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
      case 'REJECTED':
        return 'bg-destructive/10 text-destructive';
      case 'CANCELLED':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  }
}
