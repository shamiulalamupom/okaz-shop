import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateOrderItem, Order } from './order.models';

interface ListResponse<T> {
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly ordersUrl = `${environment.apiUrl}/orders`;

  getOrders() {
    return this.http.get<ListResponse<Order[]>>(this.ordersUrl).pipe(map((response) => response.data));
  }

  getOrder(id: string) {
    return this.http.get<Order>(`${this.ordersUrl}/${id}`);
  }

  /**
   * Places an order. A rejected order comes back as HTTP 409 with the order in the
   * body; we surface it as a normal Order so the caller can show its status/reason.
   */
  placeOrder(items: CreateOrderItem[]) {
    return this.http.post<Order>(this.ordersUrl, { items }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 409 && error.error && typeof error.error === 'object' && 'status' in error.error) {
          return [error.error as Order];
        }
        return throwError(() => error);
      }),
    );
  }

  cancelOrder(id: string) {
    return this.http.post<Order>(`${this.ordersUrl}/${id}/cancel`, {});
  }
}
