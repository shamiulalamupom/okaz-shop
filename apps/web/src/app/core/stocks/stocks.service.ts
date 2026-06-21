import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProductStock, Stock, Store } from './stock.models';

interface ListResponse<T> {
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class StocksService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getStores() {
    return this.http
      .get<ListResponse<Store[]>>(`${this.apiUrl}/stores`)
      .pipe(map((response) => response.data));
  }

  /** Creates a shop (manager/admin only). */
  createStore(body: { name: string; city?: string }) {
    return this.http.post<Store>(`${this.apiUrl}/stores`, body);
  }

  /** Updates a shop's name/city (manager/admin only). */
  updateStore(id: string, body: { name: string; city?: string }) {
    return this.http.put<Store>(`${this.apiUrl}/stores/${id}`, body);
  }

  /** Aggregated stock for a product across every store. */
  getProductStock(productId: string) {
    return this.http.get<ProductStock>(`${this.apiUrl}/stocks/${productId}`);
  }

  /** Sets the absolute quantity of a product in a store (manager/admin only). */
  setStock(body: { productId: string; storeId: string; quantity: number }) {
    return this.http.post<Stock>(`${this.apiUrl}/stocks`, body);
  }

  listStocks(params?: { productId?: string; storeId?: string }) {
    const query = new URLSearchParams();
    if (params?.productId) query.set('productId', params.productId);
    if (params?.storeId) query.set('storeId', params.storeId);
    const suffix = query.toString() ? `?${query.toString()}` : '';

    return this.http
      .get<ListResponse<Stock[]>>(`${this.apiUrl}/stocks${suffix}`)
      .pipe(map((response) => response.data));
  }
}
