import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ProductsService } from '../../../../core/products/products.service';

@Component({
  selector: 'app-product-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './product-create.component.html',
})
export class ProductCreateComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productsService = inject(ProductsService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0.01)]],
    category: [''],
  });

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
    };

    this.errorMessage.set('');
    this.isSubmitting.set(true);

    this.productsService
      .createProduct(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (product) => this.router.navigate(['/products', product._id]),
        error: (error) => {
          this.errorMessage.set(
            error?.error?.message ?? error?.error?.error ?? 'Impossible de creer le produit.',
          );
        },
      });
  }
}
