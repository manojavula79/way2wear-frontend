import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface OtpSendResponse {
  message: string;
  dev_otp?: string;   // only in dev mode
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly ACCESS_KEY  = 'w2w_access_token';
  private readonly REFRESH_KEY = 'w2w_refresh_token';

  isAuthenticated = signal(this.hasValidToken());
  isLoading       = signal(false);

  private readonly REQUEST_TIMEOUT_MS = 30_000;

  // ── STEP 1: Send OTP ─────────────────
  async sendOtp(phone: string): Promise<OtpSendResponse> {
    this.isLoading.set(true);
    try {
      return await firstValueFrom(
        this.http
          .post<OtpSendResponse>(`${environment.apiUrl}/auth/send-otp`, { phone })
          .pipe(timeout(this.REQUEST_TIMEOUT_MS))
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── STEP 2: Verify OTP → get JWT ─────
  async verifyOtp(phone: string, otp: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const tokens = await firstValueFrom(
        this.http
          .post<AuthTokens>(`${environment.apiUrl}/auth/verify-otp`, { phone, otp })
          .pipe(timeout(this.REQUEST_TIMEOUT_MS))
      );
      this.saveTokens(tokens);
      this.isAuthenticated.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Refresh token ─────────────────────
  async refreshAccessToken(): Promise<boolean> {
    const refresh = localStorage.getItem(this.REFRESH_KEY);
    if (!refresh) return false;
    try {
      const tokens = await firstValueFrom(
        this.http
          .post<AuthTokens>(`${environment.apiUrl}/auth/refresh`, { refresh_token: refresh })
          .pipe(timeout(this.REQUEST_TIMEOUT_MS))
      );
      this.saveTokens(tokens);
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  // ── Logout ────────────────────────────
  logout() {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  private saveTokens(tokens: AuthTokens) {
    localStorage.setItem(this.ACCESS_KEY, tokens.access_token);
    localStorage.setItem(this.REFRESH_KEY, tokens.refresh_token);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.ACCESS_KEY);
    if (!token) return false;
    try {
      // Decode JWT expiry (no library needed)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
