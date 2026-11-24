import { Component, inject, signal } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { Router } from '@angular/router';
import {
  AuthError,
  AUTH_MESSAGES,
  SignupRequest,
} from '../../core/models/auth.model';
import {
  BudgetRange,
  BUDGET_OPTIONS,
  FitType,
  FIT_OPTIONS,
  SkinTone,
  SKIN_TONE_OPTIONS,
  StylePreference,
  STYLE_OPTIONS,
} from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

type AuthMode = 'login' | 'signup';
type Gender = 'male' | 'female' | 'unisex';

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  animations: [
    trigger('authSwitch', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(28px) scale(0.985)' }),
        animate(
          '420ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'none' })
        ),
      ]),
      transition(':leave', [
        style({ position: 'absolute', top: 0, left: 0, width: '100%' }),
        animate(
          '240ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 0, transform: 'translateX(-22px) scale(0.985)' })
        ),
      ]),
    ]),
  ],
})
export class LoginPage {
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  mode = signal<AuthMode>('login');
  username = signal('');
  password = signal('');
  showPassword = signal(false);
  error = signal<string | null>(null);
  isLoading = signal(false);

  // Signup details (profile fields double as the new account's defaults)
  fullName = signal('');
  confirmPassword = signal('');
  showConfirmPassword = signal(false);
  gender = signal<Gender>('unisex');
  age = signal<number | null>(null);
  heightCm = signal<number | null>(null);
  skinTone = signal<SkinTone | ''>('');
  stylePreference = signal<StylePreference>('Minimalist / Modern');
  fitType = signal<FitType>('Regular');
  budgetRange = signal<BudgetRange>('₹2000 - ₹5000');

  readonly styleOptions = STYLE_OPTIONS;
  readonly fitOptions = FIT_OPTIONS;
  readonly skinToneOptions = SKIN_TONE_OPTIONS;
  readonly budgetOptions = BUDGET_OPTIONS;

  readonly reduceMotion =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // ── Input handlers ───────────────────────────
  onUsernameInput(event: Event) {
    this.username.set(this.inputValue(event));
    this.error.set(null);
  }

  onPasswordInput(event: Event) {
    this.password.set(this.inputValue(event));
    this.error.set(null);
  }

  onFullNameInput(event: Event) {
    this.fullName.set(this.inputValue(event));
    this.error.set(null);
  }

  onConfirmPasswordInput(event: Event) {
    this.confirmPassword.set(this.inputValue(event));
    this.error.set(null);
  }

  onNumberInput(field: 'age' | 'heightCm', event: Event) {
    const raw = this.inputValue(event);
    const value = raw ? Number(raw) : null;
    (field === 'age' ? this.age : this.heightCm).set(
      value !== null && Number.isFinite(value) ? value : null
    );
  }

  onGenderChange(event: Event) {
    this.gender.set(this.inputValue(event) as Gender);
  }

  onSkinToneChange(event: Event) {
    this.skinTone.set(this.inputValue(event) as SkinTone | '');
  }

  onStyleChange(event: Event) {
    this.stylePreference.set(this.inputValue(event) as StylePreference);
  }

  onFitChange(event: Event) {
    this.fitType.set(this.inputValue(event) as FitType);
  }

  onBudgetChange(event: Event) {
    this.budgetRange.set(this.inputValue(event) as BudgetRange);
  }

  setGender(value: Gender) {
    this.gender.set(value);
  }

  togglePassword() {
    this.showPassword.update((value) => !value);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update((value) => !value);
  }

  // ── Mode transition ──────────────────────────
  switchToSignup() {
    this.error.set(null);
    this.mode.set('signup');
  }

  switchToLogin() {
    this.error.set(null);
    this.mode.set('login');
  }

  // ── Submit ───────────────────────────────────
  async submitLogin() {
    const validationError = this.validateLogin();
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);
    try {
      await this.authService.login({
        username: this.normalizedUsername(),
        password: this.password(),
      });
      this.userService.loadFromServer();
      await this.router.navigate(['/home']);
    } catch (err) {
      this.error.set(this.errorMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitSignup() {
    const validationError = this.validateSignup();
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);
    try {
      // Availability is checked on submit; the backend unique index remains
      // the final authority for concurrent registrations.
      const available = await this.authService.checkUsername(
        this.normalizedUsername()
      );
      if (!available) {
        this.error.set(AUTH_MESSAGES.usernameTaken);
        return;
      }

      const payload: SignupRequest = {
        username: this.normalizedUsername(),
        password: this.password(),
        full_name: this.fullName().trim(),
        gender: this.gender(),
        age: this.age() ?? undefined,
        height_cm: this.heightCm() ?? undefined,
        skin_tone: this.skinTone() || undefined,
        style_preference: this.stylePreference(),
        fit_type: this.fitType(),
        budget_range: this.budgetRange(),
      };

      await this.authService.signup(payload);
      this.userService.loadFromServer();
      await this.router.navigate(['/home']);
    } catch (err) {
      this.error.set(this.errorMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  goHelp() {
    this.router.navigate(['/help']);
  }

  goTerms() {
    this.router.navigate(['/terms']);
  }

  // ── Validation & helpers ─────────────────────
  private normalizedUsername(): string {
    return this.username().trim().toLowerCase();
  }

  private validateLogin(): string | null {
    if (!this.username().trim() || !this.password()) {
      return 'Enter your username and password.';
    }
    if (!USERNAME_PATTERN.test(this.normalizedUsername())) {
      return AUTH_MESSAGES.invalidUsername;
    }
    return null;
  }

  private validateSignup(): string | null {
    if (!this.fullName().trim()) return 'Enter your full name.';
    if (!this.username().trim()) return 'Choose a username.';
    if (!USERNAME_PATTERN.test(this.normalizedUsername())) {
      return AUTH_MESSAGES.invalidUsername;
    }
    if (this.password().length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (this.password() !== this.confirmPassword()) {
      return 'Passwords do not match.';
    }
    return null;
  }

  private errorMessage(err: unknown): string {
    return err instanceof AuthError ? err.message : AUTH_MESSAGES.generic;
  }

  private inputValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }
}
