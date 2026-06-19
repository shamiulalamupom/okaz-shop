import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { of, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthState, LoginPayload, RegisterPayload, User } from './auth.models';

interface AuthResponse {
  user?: User;
  token?: string;
  accessToken?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'auth_state';
  private readonly state = signal<AuthState>(this.readStoredState());

  readonly user = computed(() => this.state().user);
  readonly token = computed(() => this.state().token);
  readonly isAuthenticated = computed(() => !!this.state().token);
  readonly roles = computed(() => this.state().user?.roles ?? []);

  /** True when the current user holds at least one of the given roles. */
  hasAnyRole(roles: string[]): boolean {
    const current = this.state().user?.roles ?? [];
    return roles.some((role) => current.includes(role));
  }

  login(payload: LoginPayload) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((response) => {
        this.setState({
          user: response.user ?? null,
          token: response.token ?? response.accessToken ?? null,
        });
      }),
    );
  }

  register(payload: RegisterPayload) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload).pipe(
      switchMap((response) => {
        const token = response.token ?? response.accessToken ?? null;

        if (response.user && token) {
          this.setState({
            user: response.user,
            token,
          });

          return of(response);
        }

        return this.login(payload);
      }),
    );
  }

  logout() {
    this.setState({
      user: null,
      token: null,
    });
  }

  private setState(state: AuthState) {
    this.state.set(state);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    }
  }

  private readStoredState(): AuthState {
    if (!isPlatformBrowser(this.platformId)) {
      return { user: null, token: null };
    }

    const raw = localStorage.getItem(this.storageKey);

    if (!raw) {
      return { user: null, token: null };
    }

    try {
      return JSON.parse(raw) as AuthState;
    } catch {
      return { user: null, token: null };
    }
  }
}
