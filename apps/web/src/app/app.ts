import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { CartService } from './core/cart/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly user = this.authService.user;
  readonly cartCount = this.cart.count;
  readonly canManage = computed(
    () => this.authService.roles().includes('STORE_MANAGER') || this.authService.roles().includes('ADMIN'),
  );

  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/products');
  }
}
