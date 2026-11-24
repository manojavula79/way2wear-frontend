import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthError, AUTH_MESSAGES, AuthTokens } from '../models/auth.model';
import { AuthService } from './auth.service';

const TOKENS: AuthTokens = {
  access_token: tokenWithExpiry(Math.floor(Date.now() / 1000) + 3600),
  refresh_token: 'refresh-token',
  token_type: 'bearer',
  expires_in: 86400,
};

function tokenWithExpiry(expSeconds: number): string {
  const payload = btoa(JSON.stringify({ exp: expSeconds }))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('logs in with username/password and stores the returned tokens', async () => {
    const promise = service.login({ username: 'manoj123', password: 'StrongPass123' });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      username: 'manoj123',
      password: 'StrongPass123',
    });
    req.flush(TOKENS);
    await promise;

    expect(localStorage.getItem('w2w_access_token')).toBe(TOKENS.access_token);
    expect(localStorage.getItem('w2w_refresh_token')).toBe(TOKENS.refresh_token);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('signs up and logs the new account in immediately', async () => {
    const promise = service.signup({
      username: 'manoj123',
      password: 'StrongPass123',
      full_name: 'Manoj Avula',
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/signup`);
    expect(req.request.body.full_name).toBe('Manoj Avula');
    req.flush(TOKENS);
    await promise;

    expect(service.isAuthenticated()).toBeTrue();
  });

  it('returns a friendly error for invalid credentials', async () => {
    const promise = service.login({ username: 'manoj123', password: 'wrong' });

    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(
      { detail: 'Internal bcrypt traceback' },
      { status: 401, statusText: 'Unauthorized' }
    );

    await expectAsync(promise).toBeRejectedWith(
      new AuthError(401, AUTH_MESSAGES.invalidCredentials)
    );
  });

  it('uses one request when refresh is called concurrently', async () => {
    localStorage.setItem('w2w_refresh_token', 'refresh-token');

    const first = service.refreshAccessToken();
    const second = service.refreshAccessToken();
    expect(first).toBe(second);

    httpMock.expectOne(`${environment.apiUrl}/auth/refresh`).flush(TOKENS);
    await Promise.all([first, second]);

    expect(service.isAuthenticated()).toBeTrue();
    httpMock.expectNone(`${environment.apiUrl}/auth/refresh`);
  });

  it('restores a valid session without showing the login screen', async () => {
    localStorage.setItem('w2w_access_token', TOKENS.access_token);
    const recreated = TestBed.inject(AuthService);

    await recreated.restoreSession();

    expect(recreated.isAuthenticated()).toBeTrue();
    httpMock.expectNone(`${environment.apiUrl}/auth/refresh`);
  });

  it('clears all auth state on explicit logout', () => {
    localStorage.setItem('w2w_access_token', TOKENS.access_token);
    localStorage.setItem('w2w_refresh_token', 'refresh-token');
    service.isAuthenticated.set(true);

    service.logout();

    expect(localStorage.getItem('w2w_access_token')).toBeNull();
    expect(localStorage.getItem('w2w_refresh_token')).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });
});
