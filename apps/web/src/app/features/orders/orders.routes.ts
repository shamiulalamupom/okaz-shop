import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guard';

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/orders-list/orders-list.component').then((m) => m.OrdersListComponent),
  },
  {
    path: ':id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
  },
];
