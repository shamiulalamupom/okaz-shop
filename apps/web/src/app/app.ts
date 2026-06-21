import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

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

  readonly mobileMenuOpen = signal(false);

  constructor() {
    // Validate the persisted session and refresh roles on load.
    this.authService.refreshSession();

    // Close the mobile menu after navigating to a new page.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.mobileMenuOpen.set(false));
  }

  toggleMenu() {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMenu() {
    this.mobileMenuOpen.set(false);
  }

  logout() {
    this.closeMenu();
    this.authService.logout();
    this.router.navigateByUrl('/products');
  }
}
