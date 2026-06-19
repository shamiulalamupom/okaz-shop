import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { CartService } from '../../../../core/cart/cart.service';
import { Product } from '../../../../core/products/product.models';
import { ProductsService } from '../../../../core/products/products.service';
import { StocksService } from '../../../../core/stocks/stocks.service';

interface StoreStock {
  storeId: string;
  storeName: string;
  quantity: number;
}

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './product-detail.component.html',
})
export class ProductDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);
  private readonly stocksService = inject(StocksService);
  private readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly product = signal<Product | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly displayInitial = computed(() => this.product()?.name.charAt(0).toUpperCase() ?? '');

  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly canManage = computed(
    () => this.auth.roles().includes('STORE_MANAGER') || this.auth.roles().includes('ADMIN'),
  );
  readonly confirmDelete = signal(false);
  readonly isDeleting = signal(false);
  readonly storeStocks = signal<StoreStock[]>([]);
  readonly availabilityError = signal(false);
  readonly selectedStoreId = signal('');
  readonly qty = signal(1);
  readonly addedToCart = signal(false);

  readonly selectedStock = computed(
    () => this.storeStocks().find((entry) => entry.storeId === this.selectedStoreId())?.quantity ?? 0,
  );

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('Produit introuvable.');
      this.isLoading.set(false);
      return;
    }

    // The product (catalogue) is public — always loadable.
    this.productsService
      .getProductById(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (product) => this.product.set(product),
        error: (error) => {
          this.errorMessage.set(
            error?.error?.message ?? error?.error?.error ?? 'Impossible de charger ce produit.',
          );
        },
      });

    // Stock/store availability requires authentication; load it best-effort so a
    // failure here never blocks viewing the product.
    if (this.auth.isAuthenticated()) {
      this.loadAvailability(id);
    }
  }

  private loadAvailability(productId: string) {
    forkJoin({
      stores: this.stocksService.getStores(),
      stock: this.stocksService.getProductStock(productId),
    }).subscribe({
      next: ({ stores, stock }) => {
        const quantityByStore = new Map(stock.stocks.map((entry) => [entry.storeId, entry.quantity]));
        const merged = stores.map((store) => ({
          storeId: store.id,
          storeName: store.name,
          quantity: quantityByStore.get(store.id) ?? 0,
        }));
        this.storeStocks.set(merged);

        // Default to the first store that has stock, otherwise the first store.
        const firstWithStock = merged.find((entry) => entry.quantity > 0) ?? merged[0];
        this.selectedStoreId.set(firstWithStock?.storeId ?? '');
      },
      error: () => this.availabilityError.set(true),
    });
  }

  selectStore(storeId: string) {
    this.selectedStoreId.set(storeId);
    this.qty.set(1);
    this.addedToCart.set(false);
  }

  increaseQty() {
    if (this.qty() < this.selectedStock()) {
      this.qty.update((value) => value + 1);
    }
  }

  decreaseQty() {
    if (this.qty() > 1) {
      this.qty.update((value) => value - 1);
    }
  }

  addToCart() {
    const product = this.product();
    const store = this.storeStocks().find((entry) => entry.storeId === this.selectedStoreId());

    if (!product || !store || store.quantity <= 0) {
      return;
    }

    this.cart.add({
      productId: product._id,
      productName: product.name,
      unitPrice: product.price,
      storeId: store.storeId,
      storeName: store.storeName,
      quantity: Math.min(this.qty(), store.quantity),
    });

    this.addedToCart.set(true);
  }

  deleteProduct() {
    const product = this.product();
    if (!product) {
      return;
    }

    // First click arms the confirmation, second click performs the delete.
    if (!this.confirmDelete()) {
      this.confirmDelete.set(true);
      return;
    }

    this.isDeleting.set(true);
    this.productsService
      .deleteProduct(product._id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/products']),
        error: (error) => {
          this.confirmDelete.set(false);
          this.errorMessage.set(
            error?.error?.message ?? error?.error?.error ?? 'Could not delete this product.',
          );
        },
      });
  }
}
