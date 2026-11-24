import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Session restoration has already run before the first navigation; this is
  // the fallback for an access token that expired while the app was open.
  if (authService.isAuthenticated()) return true;

  const refreshed = await authService.refreshAccessToken();
  return refreshed ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/home']);
  }
  return true;
};
