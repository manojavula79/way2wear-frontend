import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, TimeoutError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthError,
  AUTH_MESSAGES,
  AuthTokens,
  LoginRequest,
  SignupRequest,
  UsernameAvailabilityResponse,
} from '../models/auth.model';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private userService = inject(UserService);

  private readonly ACCESS_KEY = 'w2w_access_token';
  private readonly REFRESH_KEY = 'w2w_refresh_token';
  private readonly API = `${environment.apiUrl}/auth`;
  private readonly API_TIMEOUT = 15000;

  isAuthenticated = signal(this.hasValidToken());
  isLoading = signal(false);

  /** Single-flight guard so concurrent 401s do not trigger parallel refreshes. */
  private refreshInFlight: Promise<boolean> | null = null;

  /** Called by an APP_INITIALIZER before the router makes its first decision. */
  async restoreSession(): Promise<void> {
    if (this.hasValidToken()) {
      this.isAuthenticated.set(true);
      return;
    }
    if (localStorage.getItem(this.REFRESH_KEY)) {
      await this.refreshAccessToken();
      return;
    }
    this.clearTokens();
    this.isAuthenticated.set(false);
  }

  async login(payload: LoginRequest): Promise<void> {
    this.isLoading.set(true);
    try {
      const tokens = await firstValueFrom(
        this.http.post<AuthTokens>(`${this.API}/login`, payload)
          .pipe(timeout(this.API_TIMEOUT))
      );
      this.applyTokens(tokens);
    } catch (err) {
      throw this.toAuthError(err, 'login');
    } finally {
      this.isLoading.set(false);
    }
  }

  async signup(payload: SignupRequest): Promise<void> {
    this.isLoading.set(true);
    try {
      const tokens = await firstValueFrom(
        this.http.post<AuthTokens>(`${this.API}/signup`, payload)
          .pipe(timeout(this.API_TIMEOUT))
      );
      // Signup logs the user in immediately, using the supplied profile details.
      this.applyTokens(tokens);
    } catch (err) {
      throw this.toAuthError(err, 'signup');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Returns false when the username is taken; a failed check is non-blocking. */
  async checkUsername(username: string): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.http.get<UsernameAvailabilityResponse>(
          `${this.API}/username-available`,
          { params: { username } }
        ).pipe(timeout(this.API_TIMEOUT))
      );
      return result.available;
    } catch {
      // The signup endpoint still enforces uniqueness; let it report the outcome.
      return true;
    }
  }

  refreshAccessToken(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;

    const refresh = localStorage.getItem(this.REFRESH_KEY);
    if (!refresh) {
      this.clearTokens();
      this.isAuthenticated.set(false);
      return Promise.resolve(false);
    }

    this.refreshInFlight = (async () => {
      try {
        const tokens = await firstValueFrom(
          this.http.post<AuthTokens>(`${this.API}/refresh`, { refresh_token: refresh })
            .pipe(timeout(this.API_TIMEOUT))
        );
        this.applyTokens(tokens);
        return true;
      } catch {
        // Only an explicit logout or a genuinely invalid session clears state.
        this.clearTokens();
        this.isAuthenticated.set(false);
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  /** Explicit user logout — the only intentional way to end a valid session. */
  logout(): void {
    this.clearTokens();
    this.isAuthenticated.set(false);
    this.userService.logout();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  private applyTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.ACCESS_KEY, tokens.access_token);
    localStorage.setItem(this.REFRESH_KEY, tokens.refresh_token);
    this.isAuthenticated.set(true);
  }

  private clearTokens(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.ACCESS_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private toAuthError(err: unknown, context: 'login' | 'signup'): AuthError {
    if (err instanceof AuthError) return err;

    const status = err instanceof HttpErrorResponse ? err.status : 0;
    if (status === 0 || err instanceof TimeoutError) {
      return new AuthError(status, AUTH_MESSAGES.network);
    }
    if (status === 409) {
      return new AuthError(status, AUTH_MESSAGES.usernameTaken);
    }
    if (status === 401 && context === 'login') {
      return new AuthError(status, AUTH_MESSAGES.invalidCredentials);
    }
    if (status === 400) {
      return new AuthError(status, AUTH_MESSAGES.invalidUsername);
    }
    return new AuthError(status, AUTH_MESSAGES.generic);
  }
}
