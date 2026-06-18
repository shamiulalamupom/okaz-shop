import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Product } from '../../../../core/products/product.models';
import { ProductsService } from '../../../../core/products/products.service';

@Component({
  selector: 'app-products-list',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './products-list.component.html',
})
export class ProductsListComponent {
  private readonly productsService = inject(ProductsService);

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

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
}
