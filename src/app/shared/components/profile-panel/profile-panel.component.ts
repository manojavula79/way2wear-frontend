import {
  Component, Output, EventEmitter, inject,
  signal, ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { VoiceService } from '../../../core/services/voice.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-profile-panel',
  templateUrl: './profile-panel.component.html',
  styleUrls: ['./profile-panel.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ProfilePanelComponent {
  @Output() closed = new EventEmitter<void>();
  @ViewChild('feedbackBox') feedbackBox!: ElementRef<HTMLTextAreaElement>;

  private userService     = inject(UserService);
  private authService     = inject(AuthService);
  private feedbackService = inject(FeedbackService);
  private router          = inject(Router);
  voice                   = inject(VoiceService);

  profile = this.userService.profile;

  // Feedback state
  rating        = signal(0);
  feedbackText  = signal('');
  isSubmitting  = signal(false);
  submitted     = signal(false);
  feedbackError = signal<string | null>(null);

  readonly linkedinUrl = environment.linkedinUrl;

  // ── Star rating ───────────────────────────
  setRating(n: number) { this.rating.set(n); }

  // ── Auto-grow textarea ────────────────────
  onFeedbackInput(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    this.feedbackText.set(el.value);
    this.autoGrow(el);
  }

  private autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    const max = 150;
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }

  // ── Voice input ───────────────────────────
  toggleVoice() {
    if (this.voice.isListening()) {
      this.voice.stop();
      return;
    }
    const started = this.voice.start((text) => {
      // Append transcribed text to existing
      const current = this.feedbackText();
      const next = current ? `${current} ${text}` : text;
      this.feedbackText.set(next);
      // Sync DOM + grow
      const el = this.feedbackBox?.nativeElement;
      if (el) { el.value = next; this.autoGrow(el); }
    });
    if (!started) {
      this.feedbackError.set('Voice input is not supported on this device. Please type instead.');
    }
  }

  // ── Submit feedback ───────────────────────
  async submitFeedback() {
    const text = this.feedbackText().trim();
    if (!text || this.isSubmitting()) return;

    this.voice.stop();
    this.isSubmitting.set(true);
    this.feedbackError.set(null);

    try {
      await this.feedbackService.submitFeedback({
        rating: this.rating(),
        message: text,
      });
      this.submitted.set(true);
      this.feedbackText.set('');
      this.rating.set(0);
      // Reset success message after a few seconds
      setTimeout(() => this.submitted.set(false), 4000);
    } catch (err: any) {
      this.feedbackError.set(
        err?.message?.includes('timeout')
          ? 'Request timed out. Please try again.'
          : 'Could not send feedback. Please try again.'
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // ── Navigation ────────────────────────────
  openAccountSettings() {
    this.closed.emit();
    this.router.navigate(['/account']);
  }

  openLinkedIn() {
    window.open(this.linkedinUrl, '_blank', 'noopener,noreferrer');
  }

  close() { this.closed.emit(); }

  logout() {
    this.voice.stop();
    this.closed.emit();
    this.authService.logout();
  }
}
