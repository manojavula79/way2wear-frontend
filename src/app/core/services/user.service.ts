import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserProfile, DEFAULT_PROFILE } from '../models/user.model';

export interface CurrentUser {
  id: string;
}

export interface LegacyUserProfile {
  skin_tone?: string;
  color_preference?: string[];
  height?: number;
  profile_image_url?: string;
}

// Shape returned by GET/PATCH /users/me
interface ApiUserProfile {
  id: string;
  username?: string | null;
  phone?: string | null;
  full_name: string | null;
  gender: string | null;
  skin_tone: string | null;
  height_cm: number | null;
  age: number | null;
  style_preference: string;
  fit_type: string | null;
  budget_range: string;
  avatar_url: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  private readonly STORAGE_KEY = 'w2w_profile';
  private readonly API = `${environment.apiUrl}/users/me`;

  private _profile = signal<UserProfile>(this.loadProfile());
  profile = this._profile.asReadonly();

  private _userId = signal<string | null>(null);
  userId = this._userId.asReadonly();

  private _saving = signal(false);
  saving = this._saving.asReadonly();

  private _syncError = signal<string | null>(null);
  syncError = this._syncError.asReadonly();

  // ── Load from server (call after login / on app start) ──────────
  loadFromServer() {
    this.http.get<ApiUserProfile>(this.API).subscribe({
      next: (r) => {
        this._userId.set(r.id);
        this._profile.update((p) => ({ ...p, ...this.fromApi(r) }));
        this.persistProfile();
        this._syncError.set(null);
      },
      error: (err) => {
        console.error('Profile load failed', err);
        this._syncError.set('Could not load your profile.');
      },
    });
  }

  // ── Save: optimistic local update + PATCH, rollback on failure ──
  updateProfile(updates: Partial<UserProfile>) {
    const previous = this._profile();

    this._profile.update((p) => ({ ...p, ...updates }));
    this.persistProfile();

    const body = this.toApi(updates);
    if (Object.keys(body).length === 0) return;

    this._saving.set(true);
    this._syncError.set(null);

    this.http.patch<ApiUserProfile>(this.API, body).subscribe({
      next: (r) => {
        this._profile.update((p) => ({ ...p, ...this.fromApi(r) }));
        this.persistProfile();
        this._saving.set(false);
      },
      error: (err) => {
        console.error('Profile save failed', err);
        this._profile.set(previous);
        this.persistProfile();
        this._saving.set(false);
        this._syncError.set('Could not save your profile. Please try again.');
      },
    });
  }

  logout() {
    this._profile.set(DEFAULT_PROFILE);
    this._userId.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
    // Clear your auth tokens in your auth service as well.
  }

  // ── Kept for existing callers ───────────────────────────────────
  getCurrentUser(): Observable<CurrentUser | null> {
    return this.http.get<ApiUserProfile>(this.API).pipe(
      map((r) => {
        this._userId.set(r.id);
        return { id: r.id } as CurrentUser;
      }),
      catchError(() => of(null))
    );
  }

  getUserProfile(_userId: string): Observable<LegacyUserProfile | null> {
    const p = this._profile();
    return of({
      skin_tone: p.skinTone,
      height: p.heightCm,
      profile_image_url: p.avatarUrl,
      color_preference: undefined,
    });
  }

  // ── Mapping ─────────────────────────────────────────────────────
  private toApi(p: Partial<UserProfile>): Record<string, unknown> {
    const body: Record<string, unknown> = {
      full_name: p.name,
      gender: p.gender,
      skin_tone: p.skinTone,
      height_cm: p.heightCm,
      age: p.age,
      style_preference: p.stylePreference,
      fit_type: p.fitType,
      budget_range: p.budgetRange,
    };

    // Never send base64 avatars to the API; only real URLs
    if (p.avatarUrl && !p.avatarUrl.startsWith('data:')) {
      body['avatar_url'] = p.avatarUrl;
    }

    // Drop undefined so PATCH only carries what changed
    return Object.fromEntries(
      Object.entries(body).filter(([, v]) => v !== undefined)
    );
  }

  private fromApi(r: ApiUserProfile): Partial<UserProfile> {
    return {
      username: r.username ?? undefined,
      name: r.full_name ?? undefined,
      gender: (r.gender ?? undefined) as UserProfile['gender'],
      skinTone: (r.skin_tone ?? undefined) as UserProfile['skinTone'],
      heightCm: r.height_cm ?? undefined,
      age: r.age ?? undefined,
      stylePreference: r.style_preference as UserProfile['stylePreference'],
      fitType: (r.fit_type ?? undefined) as UserProfile['fitType'],
      budgetRange: r.budget_range as UserProfile['budgetRange'],
      avatarUrl: r.avatar_url ?? undefined,
    };
  }
  uploadAvatar(file: File): Observable<ApiUserProfile> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiUserProfile>(`${this.API}/avatar`, form).pipe(
      tap((r) => {
        this._profile.update((p) => ({ ...p, ...this.fromApi(r) }));
        this.persistProfile();
      })
    );
  }

  // ── Local cache ─────────────────────────────────────────────────
  private persistProfile() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._profile()));
    } catch (e) {
      // Quota exceeded (e.g. large base64 avatar); the server copy is still fine
      console.warn('Could not cache profile locally', e);
    }
  }

  private loadProfile(): UserProfile {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return DEFAULT_PROFILE;
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PROFILE;
    }
  }
}