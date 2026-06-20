import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Address, AddressPayload } from './address.models';

@Injectable({
  providedIn: 'root',
})
export class AddressesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth/me/addresses`;

  list() {
    return this.http.get<{ data: Address[] }>(this.url).pipe(map((response) => response.data));
  }

  add(payload: AddressPayload) {
    return this.http.post<Address>(this.url, payload);
  }

  remove(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }
}
