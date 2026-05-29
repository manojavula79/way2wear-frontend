import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import {
  StylePreference, FitType, SkinTone, BudgetRange,
  STYLE_OPTIONS, FIT_OPTIONS, SKIN_TONE_OPTIONS, BUDGET_OPTIONS,
} from '../../core/models/user.model';

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class AccountPage {
  private userService = inject(UserService);
  private router      = inject(Router);

  profile = this.userService.profile;

  // Dropdown options
  styleOptions    = STYLE_OPTIONS;
  fitOptions      = FIT_OPTIONS;
  skinToneOptions = SKIN_TONE_OPTIONS;
  budgetOptions   = BUDGET_OPTIONS;

  // Editable form state (initialized from profile)
  name        = signal(this.profile().name);
  gender      = signal(this.profile().gender ?? 'unisex');
  heightCm    = signal<number | null>(this.profile().heightCm ?? null);
  skinTone    = signal<SkinTone | undefined>(this.profile().skinTone);
  style       = signal<StylePreference>(this.profile().stylePreference);
  fit         = signal<FitType>(this.profile().fitType);
  budget      = signal<BudgetRange>(this.profile().budgetRange);
  avatarUrl   = signal<string | undefined>(this.profile().avatarUrl);

  saved = signal(false);

  // ── Photo upload (local preview as base64) ──
  onPhotoSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Please choose an image under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.avatarUrl.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  setGender(g: 'male' | 'female' | 'unisex') { this.gender.set(g); }

  onHeightInput(event: Event) {
    const v = (event.target as HTMLInputElement).value;
    this.heightCm.set(v ? +v : null);
  }

  // ── Save ──────────────────────────────────
  save() {
    this.userService.updateProfile({
      name:            this.name().trim() || 'Fashion Enthusiast',
      gender:          this.gender(),
      heightCm:        this.heightCm() ?? undefined,
      skinTone:        this.skinTone(),
      stylePreference: this.style(),
      fitType:         this.fit(),
      budgetRange:     this.budget(),
      avatarUrl:       this.avatarUrl(),
    });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }

  goBack() { this.router.navigate(['/home']); }

  get initials(): string {
    const n = this.name().trim();
    if (!n) return 'W';
    const parts = n.split(' ');
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
}
