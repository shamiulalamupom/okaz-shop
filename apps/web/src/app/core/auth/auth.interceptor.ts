import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Attaches the JWT bearer token to requests that target the gateway API, so
 * authenticated features (stocks, orders) don't have to set the header manually.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();

  if (token && req.url.startsWith(environment.apiUrl) && !req.headers.has('Authorization')) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }

  return next(req);
};
