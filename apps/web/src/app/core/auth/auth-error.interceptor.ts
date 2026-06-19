import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * When an authenticated request comes back 401, the token is expired or invalid —
 * clear the session so the UI reflects a logged-out state. Guards then handle
 * redirecting away from protected routes on the next navigation.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.token()) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
