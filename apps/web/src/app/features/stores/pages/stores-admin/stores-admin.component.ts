import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { Store } from '../../../../core/stocks/stock.models';
import { StocksService } from '../../../../core/stocks/stocks.service';

@Component({
  selector: 'app-stores-admin',
  imports: [FormsModule],
  templateUrl: './stores-admin.component.html',
})
export class StoresAdminComponent {
  private readonly stocksService = inject(StocksService);

  readonly stores = signal<Store[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly name = signal('');
  readonly city = signal('');
  readonly isCreating = signal(false);
  readonly createError = signal('');

  readonly canCreate = computed(() => this.name().trim().length > 0);

  // Inline editing of an existing shop.
  readonly editingId = signal<string | null>(null);
  readonly editName = signal('');
  readonly editCity = signal('');
  readonly isSaving = signal(false);
  readonly editError = signal('');

  constructor() {
    this.load();
  }

  load() {
    this.isLoading.set(true);
    this.stocksService
      .getStores()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (stores) => this.stores.set(stores),
        error: (error) =>
          this.errorMessage.set(error?.error?.message ?? error?.error?.error ?? 'Could not load shops.'),
      });
  }

  create() {
    const name = this.name().trim();
    if (!name) {
      return;
    }
    const city = this.city().trim();

    this.isCreating.set(true);
    this.createError.set('');
    this.stocksService
      .createStore({ name, city: city || undefined })
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: (store) => {
          this.stores.update((list) => [...list, store].sort((a, b) => a.name.localeCompare(b.name)));
          this.name.set('');
          this.city.set('');
        },
        error: (error) =>
          this.createError.set(error?.error?.message ?? error?.error?.error ?? 'Could not create the shop.'),
      });
  }

  startEdit(store: Store) {
    this.editingId.set(store.id);
    this.editName.set(store.name);
    this.editCity.set(store.city ?? '');
    this.editError.set('');
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editError.set('');
  }

  saveEdit(id: string) {
    const name = this.editName().trim();
    if (!name) {
      return;
    }
    const city = this.editCity().trim();

    this.isSaving.set(true);
    this.editError.set('');
    this.stocksService
      .updateStore(id, { name, city: city || undefined })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (updated) => {
          this.stores.update((list) =>
            list.map((store) => (store.id === id ? updated : store)).sort((a, b) => a.name.localeCompare(b.name)),
          );
          this.editingId.set(null);
        },
        error: (error) =>
          this.editError.set(error?.error?.message ?? error?.error?.error ?? 'Could not update the shop.'),
      });
  }
}
