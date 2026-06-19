import { Routes } from '@angular/router';

import { managerGuard } from '../../core/auth/manager.guard';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/products-list/products-list.component').then((m) => m.ProductsListComponent),
  },
  {
    path: 'new',
    canActivate: [managerGuard],
    loadComponent: () =>
      import('./pages/product-create/product-create.component').then((m) => m.ProductCreateComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/product-detail/product-detail.component').then((m) => m.ProductDetailComponent),
  },
];
