import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Prevents an infinite refresh/retry loop for a request that already retried. */
const RETRIED = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getAccessToken();

  const authReq = token && !req.headers.has('Authorization')
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Auth endpoints handle their own errors; do not clear a valid session
      // because of a failed login attempt or a rejected refresh.
      if (error.status !== 401 || req.url.includes('/auth/') || req.context.get(RETRIED)) {
        return throwError(() => error);
      }

      return from(auth.refreshAccessToken()).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            router.navigate(['/login']);
            return throwError(() => error);
          }
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${auth.getAccessToken()}` },
          });
          retryReq.context.set(RETRIED, true);
          return next(retryReq);
        })
      );
    })
  );
};
