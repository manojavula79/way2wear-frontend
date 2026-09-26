import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly STORAGE_KEY = 'w2w_profile';
  private readonly USER_ID_KEY = 'w2w_user_id';

  private _profile = signal<UserProfile>(this.loadProfile());
  profile = this._profile.asReadonly();

  updateProfile(updates: Partial<UserProfile>) {
    this._profile.update((p) => ({ ...p, ...updates }));
    this.persistProfile();
  }

  logout() {
    this._profile.set(DEFAULT_PROFILE);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  getCurrentUser(): Observable<CurrentUser | null> {
    let id = localStorage.getItem(this.USER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(this.USER_ID_KEY, id);
    }
    return of({ id });
  }

  getUserProfile(_userId: string): Observable<LegacyUserProfile | null> {
    const p = this._profile();
    const legacy: LegacyUserProfile = {
      skin_tone: p.skinTone,
      height: p.heightCm,
      profile_image_url: p.avatarUrl,
      // color_preference has no equivalent field on UserProfile yet —
      // add one there if you actually need to persist this
      color_preference: undefined,
    };
    return of(legacy);
  }

  private persistProfile() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._profile()));
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
