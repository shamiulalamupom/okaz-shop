import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Product, ProductApiResponse, ProductPayload } from './product.models';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly productsUrl = `${environment.apiUrl}/products`;

  getProducts() {
    return this.http
      .get<ProductApiResponse<Product[]>>(this.productsUrl)
      .pipe(map((response) => response.data));
  }

  getProductById(id: string) {
    return this.http
      .get<ProductApiResponse<Product>>(`${this.productsUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  createProduct(payload: ProductPayload) {
    return this.http
      .post<ProductApiResponse<Product>>(this.productsUrl, payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  updateProduct(id: string, payload: Partial<ProductPayload>) {
    return this.http
      .put<ProductApiResponse<Product>>(`${this.productsUrl}/${id}`, payload, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  deleteProduct(id: string) {
    return this.http
      .delete<ProductApiResponse<Product>>(`${this.productsUrl}/${id}`, {
        headers: this.authHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  private authHeaders() {
    const token = this.authService.token();

    return token
      ? new HttpHeaders({
          Authorization: `Bearer ${token}`,
        })
      : undefined;
  }
}
