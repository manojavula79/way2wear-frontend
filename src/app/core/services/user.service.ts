import { Injectable, signal } from '@angular/core';
import { UserProfile, DEFAULT_PROFILE } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly STORAGE_KEY = 'w2w_profile';
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
