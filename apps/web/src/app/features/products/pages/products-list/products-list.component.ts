import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { CartService } from '../../../../core/cart/cart.service';
import { Product } from '../../../../core/products/product.models';
import { ProductsService } from '../../../../core/products/products.service';
import { Store } from '../../../../core/stocks/stock.models';
import { StocksService } from '../../../../core/stocks/stocks.service';

@Component({
  selector: 'app-products-list',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './products-list.component.html',
})
export class ProductsListComponent {
  private readonly productsService = inject(ProductsService);
  private readonly stocksService = inject(StocksService);
  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  // Per-card quick-add feedback: maps a productId to 'added' | 'out' | 'busy'.
  readonly addState = signal<Record<string, 'added' | 'out' | 'busy'>>({});
  private storesById = new Map<string, Store>();

  // Catégorie sélectionnée (signal pour filtrage réactif)
  readonly selectedCategory = signal('All');

  // Catégories dérivées des produits chargés (+ "All")
  readonly categories = computed(() => {
    const fromProducts = this.products()
      .map((product) => product.category)
      .filter((category): category is string => !!category);
    return ['All', ...Array.from(new Set(fromProducts))];
  });

  // Produits visibles selon la catégorie sélectionnée
  readonly visibleProducts = computed(() => {
    const category = this.selectedCategory();
    if (category === 'All') {
      return this.products();
    }
    return this.products().filter((product) => product.category === category);
  });

  constructor() {
    this.loadProducts();

    // Stores are needed to label cart lines; load them when signed in.
    if (this.auth.isAuthenticated()) {
      this.stocksService.getStores().subscribe({
        next: (stores) => stores.forEach((store) => this.storesById.set(store.id, store)),
        error: () => {
          /* availability is best-effort here */
        },
      });
    }
  }

  private loadProducts() {
    this.productsService
      .getProducts()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (products) => this.products.set(products),
        error: (error) => {
          this.errorMessage.set(
            error?.error?.message ?? error?.error?.error ?? 'Impossible de charger les produits.',
          );
        },
      });
  }

  /**
   * Quick-add from a product card: routes guests to login, otherwise adds one unit
   * from the first store that has stock for this product.
   */
  quickAdd(product: Product, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.setAddState(product._id, 'busy');

    this.stocksService.getProductStock(product._id).subscribe({
      next: (stock) => {
        const available = stock.stocks.find((entry) => entry.quantity > 0);
        if (!available) {
          this.flashAddState(product._id, 'out');
          return;
        }

        const store = this.storesById.get(available.storeId);
        this.cart.add({
          productId: product._id,
          productName: product.name,
          unitPrice: product.price,
          storeId: available.storeId,
          storeName: store?.name ?? 'Store',
          quantity: 1,
        });
        this.flashAddState(product._id, 'added');
      },
      error: () => this.flashAddState(product._id, 'out'),
    });
  }

  addLabel(productId: string): string {
    switch (this.addState()[productId]) {
      case 'added':
        return 'Added';
      case 'out':
        return 'Out of stock';
      case 'busy':
        return 'Adding…';
      default:
        return '+ Add';
    }
  }

  private setAddState(productId: string, value: 'added' | 'out' | 'busy') {
    this.addState.update((state) => ({ ...state, [productId]: value }));
  }

  private flashAddState(productId: string, value: 'added' | 'out') {
    this.setAddState(productId, value);
    setTimeout(() => {
      this.addState.update((state) => {
        const next = { ...state };
        delete next[productId];
        return next;
      });
    }, 1800);
  }
}
