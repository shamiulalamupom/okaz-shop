import { Routes } from '@angular/router';

import { authGuard } from '../../core/auth/auth.guard';
import { managerGuard } from '../../core/auth/manager.guard';

export const ORDERS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/orders-list/orders-list.component').then((m) => m.OrdersListComponent),
  },
  {
    path: 'admin',
    canActivate: [managerGuard],
    loadComponent: () =>
      import('./pages/admin-orders/admin-orders.component').then((m) => m.AdminOrdersComponent),
  },
  {
    path: ':id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/order-detail/order-detail.component').then((m) => m.OrderDetailComponent),
  },
];
