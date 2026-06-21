import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AppNotification } from './notification.models';

interface ListResponse<T> {
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  list() {
    return this.http
      .get<ListResponse<AppNotification[]>>(this.baseUrl)
      .pipe(map((response) => response.data));
  }

  unreadCount() {
    return this.http
      .get<{ count: number }>(`${this.baseUrl}/unread-count`)
      .pipe(map((response) => response.count));
  }

  markRead(id: string) {
    return this.http.post<{ ok: boolean }>(`${this.baseUrl}/${id}/read`, {});
  }

  markAllRead() {
    return this.http.post<{ ok: boolean; count: number }>(`${this.baseUrl}/read-all`, {});
  }
}
