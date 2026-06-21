import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { Order, OrderStatus } from '../../../../core/orders/order.models';
import { OrdersService } from '../../../../core/orders/orders.service';
import { ProductsService } from '../../../../core/products/products.service';
import { RealtimeService } from '../../../../core/realtime/realtime.service';
import { StocksService } from '../../../../core/stocks/stocks.service';

@Component({
  selector: 'app-order-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './order-detail.component.html',
})
export class OrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  private readonly productsService = inject(ProductsService);
  private readonly stocksService = inject(StocksService);
  private readonly realtime = inject(RealtimeService);
  private readonly auth = inject(AuthService);

  private readonly orderId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly order = signal<Order | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly isCancelling = signal(false);
  readonly isDelivering = signal(false);

  /** Staff (store managers / admins) can mark a validated order delivered. */
  readonly canManage = computed(
    () => this.auth.roles().includes('STORE_MANAGER') || this.auth.roles().includes('ADMIN'),
  );

  // Lookups so order lines show product/store names instead of raw ids.
  private readonly productNames = signal<Record<string, string>>({});
  private readonly storeNames = signal<Record<string, string>>({});

  constructor() {
    this.load();
    this.loadReferenceData();
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

  private loadReferenceData() {
    this.productsService.getProducts().subscribe({
      next: (products) =>
        this.productNames.set(Object.fromEntries(products.map((product) => [product._id, product.name]))),
      error: () => {
        /* names are best-effort */
      },
    });
    this.stocksService.getStores().subscribe({
      next: (stores) =>
        this.storeNames.set(Object.fromEntries(stores.map((store) => [store.id, store.name]))),
      error: () => {
        /* names are best-effort */
      },
    });
  }

  productName(productId: string): string {
    return this.productNames()[productId] ?? `#${productId.slice(-6)}`;
  }

  storeName(storeId: string): string {
    return this.storeNames()[storeId] ?? '';
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

  deliver() {
    const current = this.order();
    if (!current) {
      return;
    }

    this.isDelivering.set(true);
    this.ordersService
      .deliverOrder(current.id)
      .pipe(finalize(() => this.isDelivering.set(false)))
      .subscribe({
        next: (order) => this.order.set(order),
        error: (error) =>
          this.errorMessage.set(error?.error?.message ?? error?.error?.error ?? 'Could not mark this order delivered.'),
      });
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
