import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  storeId: string;
  storeName: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'okaz_cart';
  private readonly state = signal<CartItem[]>(this.readStored());

  readonly items = this.state.asReadonly();
  readonly count = computed(() => this.state().reduce((sum, item) => sum + item.quantity, 0));
  readonly total = computed(() => this.state().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));

  /** Adds (or merges) a line for a product+store pair. */
  add(item: CartItem) {
    const items = [...this.state()];
    const existing = items.find((line) => line.productId === item.productId && line.storeId === item.storeId);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      items.push({ ...item });
    }

    this.commit(items);
  }

  setQuantity(productId: string, storeId: string, quantity: number) {
    if (quantity <= 0) {
      this.remove(productId, storeId);
      return;
    }

    this.commit(
      this.state().map((line) =>
        line.productId === productId && line.storeId === storeId ? { ...line, quantity } : line,
      ),
    );
  }

  remove(productId: string, storeId: string) {
    this.commit(this.state().filter((line) => !(line.productId === productId && line.storeId === storeId)));
  }

  clear() {
    this.commit([]);
  }

  private commit(items: CartItem[]) {
    this.state.set(items);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    }
  }

  private readStored(): CartItem[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      return [];
    }
  }
}
