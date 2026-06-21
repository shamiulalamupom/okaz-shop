import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { CartService } from './core/cart/cart.service';
import { NotificationsStore } from './core/notifications/notifications.store';
import { NotificationsBellComponent } from './shared/notifications-bell/notifications-bell.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationsBellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);
  // Eagerly create the store so its load/live-refresh effects run app-wide.
  private readonly notifications = inject(NotificationsStore);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly user = this.authService.user;
  readonly cartCount = this.cart.count;
  readonly canManage = computed(
    () => this.authService.roles().includes('STORE_MANAGER') || this.authService.roles().includes('ADMIN'),
  );

  constructor() {
    // Validate the persisted session and refresh roles on load.
    this.authService.refreshSession();
  }

  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/products');
  }
}
