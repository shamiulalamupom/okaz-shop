import { CurrencyPipe, LowerCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { CartService } from '../../../../core/cart/cart.service';
import { Order } from '../../../../core/orders/order.models';
import { OrdersService } from '../../../../core/orders/orders.service';

@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, LowerCasePipe, RouterLink],
  templateUrl: './cart.component.html',
})
export class CartComponent {
  private readonly ordersService = inject(OrdersService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);

  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isPlacing = signal(false);
  readonly errorMessage = signal('');
  readonly placedOrder = signal<Order | null>(null);

  increment(productId: string, storeId: string, current: number) {
    this.cart.setQuantity(productId, storeId, current + 1);
  }

  decrement(productId: string, storeId: string, current: number) {
    this.cart.setQuantity(productId, storeId, current - 1);
  }

  remove(productId: string, storeId: string) {
    this.cart.remove(productId, storeId);
  }

  placeOrder() {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const items = this.cart.items().map((line) => ({
      productId: line.productId,
      storeId: line.storeId,
      quantity: line.quantity,
    }));

    if (items.length === 0) {
      return;
    }

    this.errorMessage.set('');
    this.placedOrder.set(null);
    this.isPlacing.set(true);

    this.ordersService
      .placeOrder(items)
      .pipe(finalize(() => this.isPlacing.set(false)))
      .subscribe({
        next: (order) => {
          this.placedOrder.set(order);
          if (order.status === 'VALIDATED') {
            this.cart.clear();
          }
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.message ?? error?.error?.error ?? 'Could not place the order.');
        },
      });
  }
}
