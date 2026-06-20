import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { UploadResult } from '../../../../core/media/media.models';
import { Product } from '../../../../core/products/product.models';
import { ProductsService } from '../../../../core/products/products.service';
import { Store } from '../../../../core/stocks/stock.models';
import { StocksService } from '../../../../core/stocks/stocks.service';
import { ImageUploadComponent } from '../../../../shared/image-upload/image-upload.component';

@Component({
  selector: 'app-product-create',
  imports: [ReactiveFormsModule, RouterLink, ImageUploadComponent],
  templateUrl: './product-create.component.html',
})
export class ProductCreateComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productsService = inject(ProductsService);
  private readonly stocksService = inject(StocksService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly imageUrl = signal<string | null>(null);
  private readonly imageMediaId = signal<string | null>(null);

  readonly stores = signal<Store[]>([]);
  // Initial stock quantity per storeId (0 = none).
  readonly stockByStore = signal<Record<string, number>>({});

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0.01)]],
    category: [''],
  });

  constructor() {
    this.stocksService.getStores().subscribe({
      next: (stores) => this.stores.set(stores),
      error: () => {
        /* stock is optional; ignore if stores can't be loaded */
      },
    });
  }

  stockFor(storeId: string): number {
    return this.stockByStore()[storeId] ?? 0;
  }

  setStock(storeId: string, value: string) {
    const quantity = Math.max(0, Math.floor(Number(value) || 0));
    this.stockByStore.update((state) => ({ ...state, [storeId]: quantity }));
  }

  onImageUploaded(result: UploadResult) {
    this.imageUrl.set(result.cdnUrl);
    this.imageMediaId.set(result.mediaId);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const payload = {
      name: rawValue.name.trim(),
      description: rawValue.description.trim() || undefined,
      price: Number(rawValue.price),
      category: rawValue.category.trim() || undefined,
      imageUrl: this.imageUrl() ?? undefined,
      imageMediaId: this.imageMediaId() ?? undefined,
    };

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.productsService.createProduct(payload).subscribe({
      next: (product) => this.applyInitialStock(product),
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          error?.error?.message ?? error?.error?.error ?? 'Could not create the product.',
        );
      },
    });
  }

  private applyInitialStock(product: Product) {
    const entries = Object.entries(this.stockByStore()).filter(([, quantity]) => quantity > 0);

    if (entries.length === 0) {
      this.isSubmitting.set(false);
      this.router.navigate(['/products', product._id]);
      return;
    }

    const calls = entries.map(([storeId, quantity]) =>
      this.stocksService.setStock({ productId: product._id, storeId, quantity }),
    );

    forkJoin(calls)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        // The product is created either way; navigate even if a stock call fails.
        next: () => this.router.navigate(['/products', product._id]),
        error: () => this.router.navigate(['/products', product._id]),
      });
  }
}
