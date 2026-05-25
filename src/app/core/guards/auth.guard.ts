import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  // Already authenticated → allow
  if (authService.isAuthenticated()) {
    return true;
  }

  // Try refreshing the token once
  const refreshed = await authService.refreshAccessToken();
  if (refreshed) {
    return true;
  }

  // Not authenticated → redirect to login
  return router.createUrlTree(['/login']);
};

// Guard for the login page — skip if already logged in
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/home']);
  }
  return true;
};
