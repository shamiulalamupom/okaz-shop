import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Allows only store managers / admins; redirects everyone else away. */
export const managerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  if (authService.hasAnyRole(['STORE_MANAGER', 'ADMIN'])) {
    return true;
  }

  return router.createUrlTree(['/products']);
};
