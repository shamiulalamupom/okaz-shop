import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Product } from '../../../../core/products/product.models';
import { ProductsService } from '../../../../core/products/products.service';

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './product-detail.component.html',
})
export class ProductDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);

  readonly product = signal<Product | null>(null);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly displayInitial = computed(() => this.product()?.name.charAt(0).toUpperCase() ?? '');

// Quantité sélectionnée
  qty = 1;

  // Augmenter la quantité
  increaseQty() { this.qty++; }

  // Diminuer la quantité
  decreaseQty() { if (this.qty > 1) this.qty--; }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('Produit introuvable.');
      this.isLoading.set(false);
      return;
    }

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
  }
}
