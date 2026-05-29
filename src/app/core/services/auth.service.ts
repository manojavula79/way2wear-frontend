import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import {
  getAuth, Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';
import { firstValueFrom, timeout } from 'rxjs';

export interface AuthTokens {
  access_token:  string;
  refresh_token: string;
  token_type:    string;
  expires_in:    number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  private firebaseApp!: FirebaseApp;
  private firebaseAuth!: Auth;
  private recaptchaVerifier?: RecaptchaVerifier;
  private confirmationResult?: ConfirmationResult;

  private readonly ACCESS_KEY  = 'w2w_access_token';
  private readonly REFRESH_KEY = 'w2w_refresh_token';
  private readonly API_TIMEOUT = 15000;

  isAuthenticated = signal(this.hasValidToken());
  isLoading       = signal(false);

  constructor() {
    if (getApps().length === 0) {
      this.firebaseApp = initializeApp(environment.firebase);
    } else {
      this.firebaseApp = getApps()[0];
    }
    this.firebaseAuth = getAuth(this.firebaseApp);
  }

  initRecaptcha(containerId: string) {
    try {
      if (this.recaptchaVerifier) {
        return;
      }
      this.recaptchaVerifier = new RecaptchaVerifier(
        this.firebaseAuth, containerId,
        { size: 'invisible', callback: () => {} }
      );
    } catch (err) {
      console.error('reCAPTCHA init error:', err);
    }
  }

  async sendOtp(phone: string): Promise<void> {
    this.isLoading.set(true);
    try {
      if (!this.recaptchaVerifier) throw new Error('reCAPTCHA not initialized');
      this.confirmationResult = await signInWithPhoneNumber(
        this.firebaseAuth, phone, this.recaptchaVerifier
      );
    } catch (err: any) {
      // this.recaptchaVerifier?.clear();
      // this.recaptchaVerifier = undefined;
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async verifyOtp(otp: string): Promise<void> {
    if (!this.confirmationResult) throw new Error('Please request an OTP first');
    this.isLoading.set(true);
    try {
      const result  = await this.confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();

      const tokens = await firstValueFrom(
        this.http.post<AuthTokens>(
          `${environment.apiUrl}/auth/firebase-verify`,
          { id_token: idToken }
        ).pipe(timeout(this.API_TIMEOUT))
      );
      this.saveTokens(tokens);
      this.isAuthenticated.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    const refresh = localStorage.getItem(this.REFRESH_KEY);
    if (!refresh) return false;
    try {
      const tokens = await firstValueFrom(
        this.http.post<AuthTokens>(
          `${environment.apiUrl}/auth/refresh`,
          { refresh_token: refresh }
        ).pipe(timeout(this.API_TIMEOUT))
      );
      this.saveTokens(tokens);
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  logout() {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    this.isAuthenticated.set(false);
    this.firebaseAuth.signOut().catch(() => {});
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  private saveTokens(t: AuthTokens) {
    localStorage.setItem(this.ACCESS_KEY, t.access_token);
    localStorage.setItem(this.REFRESH_KEY, t.refresh_token);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.ACCESS_KEY);
    if (!token) return false;
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      return p.exp * 1000 > Date.now();
    } catch { return false; }
  }
}
