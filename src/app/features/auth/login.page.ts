import {
  Component, OnInit, OnDestroy, AfterViewInit,
  signal, computed, ViewChildren, QueryList, ElementRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type Step = 'phone' | 'otp';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class LoginPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private router      = inject(Router);
  private authService = inject(AuthService);

  step          = signal<Step>('phone');
  phoneNumber   = signal('');
  isLoading     = signal(false);
  error         = signal<string | null>(null);
  resendSeconds = signal(0);
  filledCount   = signal(0);

  private otpDigits   = ['', '', '', '', '', ''];
  private resendTimer: any = null;

  otpComplete = computed(() => this.filledCount() === 6);

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  ngAfterViewInit() {
    // Initialize Firebase reCAPTCHA (invisible)
    this.authService.initRecaptcha('recaptcha-container');
  }

  ngOnDestroy() {
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  get fullPhone()  { return `+91${this.phoneNumber()}`; }
  get phoneValid() { return this.phoneNumber().length === 10; }
  get otpValue()   { return this.otpDigits.join(''); }

  onPhoneInput(event: Event) {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    this.phoneNumber.set(raw.slice(0, 10));
    this.error.set(null);
  }

  // ── Send OTP via Firebase ─────────────────
  async sendOtp() {
    if (!this.phoneValid || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      await this.authService.sendOtp(this.fullPhone);
      this.step.set('otp');
      this.startResendTimer();
      setTimeout(() => this.focusBox(0), 150);
    } catch (err: any) {
      const msg = this.getFirebaseError(err);
      this.error.set(msg);
      // Re-init reCAPTCHA after error
      setTimeout(() => this.authService.initRecaptcha('recaptcha-container'), 500);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Verify OTP via Firebase ───────────────
  async verifyOtp() {
    if (!this.otpComplete() || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      await this.authService.verifyOtp(this.otpValue);
      await this.router.navigate(['/home']);
    } catch (err: any) {
      this.error.set(this.getFirebaseError(err));
      this.clearOtp();
      setTimeout(() => this.focusBox(0), 100);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Firebase error messages ───────────────
  private getFirebaseError(err: any): string {
    const code = err?.code || '';
    const errorMap: Record<string, string> = {
      'auth/invalid-phone-number':    'Invalid phone number. Use +91XXXXXXXXXX format.',
      'auth/too-many-requests':       'Too many attempts. Please try again later.',
      'auth/invalid-verification-code': 'Incorrect OTP. Please try again.',
      'auth/code-expired':            'OTP expired. Please request a new one.',
      'auth/quota-exceeded':          'SMS quota exceeded. Try again later.',
      'auth/captcha-check-failed':    'reCAPTCHA failed. Please refresh and try again.',
      'auth/network-request-failed':  'Network error. Check your connection.',
    };
    return errorMap[code] || err?.message || 'Something went wrong. Please try again.';
  }

  // ── OTP keydown ──────────────────────────
  onOtpKeydown(event: KeyboardEvent, index: number) {
    if (this.isLoading()) { event.preventDefault(); return; }
    const key = event.key;
    if (key === 'Tab') return;
    if (key === 'ArrowLeft')  { event.preventDefault(); this.focusBox(index - 1); return; }
    if (key === 'ArrowRight') { event.preventDefault(); this.focusBox(index + 1); return; }
    if (key === 'Backspace') {
      event.preventDefault();
      if (this.otpDigits[index]) {
        this.otpDigits[index] = '';
        this.setBoxValue(index, '');
        this.filledCount.set(this.countFilled());
      } else if (index > 0) {
        this.otpDigits[index - 1] = '';
        this.setBoxValue(index - 1, '');
        this.filledCount.set(this.countFilled());
        this.focusBox(index - 1);
      }
      return;
    }
    if (!/^\d$/.test(key)) { event.preventDefault(); return; }
    event.preventDefault();
    this.otpDigits[index] = key;
    this.setBoxValue(index, key);
    this.filledCount.set(this.countFilled());
    this.error.set(null);
    if (index < 5) this.focusBox(index + 1);
    if (this.otpComplete()) setTimeout(() => this.verifyOtp(), 200);
  }

  onOtpPaste(event: ClipboardEvent) {
    if (this.isLoading()) return;
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    for (let i = 0; i < 6; i++) {
      this.otpDigits[i] = pasted[i] ?? '';
      this.setBoxValue(i, this.otpDigits[i]);
    }
    this.filledCount.set(this.countFilled());
    const next = this.otpDigits.findIndex(d => d === '');
    this.focusBox(next === -1 ? 5 : next);
    if (this.otpComplete()) setTimeout(() => this.verifyOtp(), 200);
  }

  private focusBox(i: number) {
    if (i < 0 || i > 5) return;
    this.otpInputs.get(i)?.nativeElement.focus();
  }

  private setBoxValue(i: number, v: string) {
    const el = this.otpInputs.get(i)?.nativeElement;
    if (el) el.value = v;
  }

  private countFilled(): number {
    return this.otpDigits.filter(d => d !== '').length;
  }

  clearOtp() {
    this.otpDigits = ['', '', '', '', '', ''];
    this.filledCount.set(0);
    setTimeout(() => this.otpInputs?.forEach(el => { el.nativeElement.value = ''; }));
  }

  startResendTimer() {
    this.resendSeconds.set(60);
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      const s = this.resendSeconds() - 1;
      this.resendSeconds.set(s);
      if (s <= 0) clearInterval(this.resendTimer);
    }, 1000);
  }

  resendOtp() {
    if (this.resendSeconds() > 0 || this.isLoading()) return;
    this.clearOtp();
    this.authService.initRecaptcha('recaptcha-container');
    setTimeout(() => this.sendOtp(), 300);
  }

  goBack() {
    this.step.set('phone');
    this.error.set(null);
    this.clearOtp();
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendSeconds.set(0);
    setTimeout(() => this.authService.initRecaptcha('recaptcha-container'), 300);
  }
}
