import {
  Component, OnInit, OnDestroy,
  signal, ViewChildren, QueryList, ElementRef, inject,
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
export class LoginPage implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  private router      = inject(Router);
  private authService = inject(AuthService);

  step          = signal<Step>('phone');
  phoneNumber   = signal('');
  countryCode   = signal('+91');
  isLoading     = signal(false);
  error         = signal<string | null>(null);
  devOtp        = signal<string | null>(null);
  resendSeconds = signal(0);

  // Plain array — NOT a signal — avoids re-render on every keystroke
  private otpDigits = ['', '', '', '', '', ''];
  private resendTimer: any = null;

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnDestroy() {
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  get fullPhone()   { return `${this.countryCode()}${this.phoneNumber()}`; }
  get phoneValid()  { return this.phoneNumber().length === 10; }
  get otpValue()    { return this.otpDigits.join(''); }
  get otpComplete() { return this.otpDigits.every(d => d !== ''); }

  onPhoneInput(event: Event) {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    this.phoneNumber.set(raw.slice(0, 10));
    this.error.set(null);
  }

  async sendOtp() {
    if (!this.phoneValid || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);
    this.devOtp.set(null);
    try {
      const res = await this.authService.sendOtp(this.fullPhone);
      this.step.set('otp');
      this.startResendTimer();
      if (res?.dev_otp) this.devOtp.set(res.dev_otp);
      setTimeout(() => this.focusBox(0), 150);
    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError';
      this.error.set(
        isTimeout
          ? 'Request timed out. Please check your connection and try again.'
          : (err?.error?.detail || 'Failed to send OTP. Try again.')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async verifyOtp() {
    if (!this.otpComplete || this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      await this.authService.verifyOtp(this.fullPhone, this.otpValue);
      await this.router.navigate(['/home']);
    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError';
      this.error.set(
        isTimeout
          ? 'Request timed out. Please check your connection and try again.'
          : (err?.error?.detail || 'Invalid OTP. Please try again.')
      );
      this.clearOtp();
      setTimeout(() => this.focusBox(0), 100);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Capture keydown BEFORE browser renders — full control, no jumping
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
      } else if (index > 0) {
        this.otpDigits[index - 1] = '';
        this.setBoxValue(index - 1, '');
        this.focusBox(index - 1);
      }
      return;
    }
    if (!/^\d$/.test(key)) { event.preventDefault(); return; }

    // Digit pressed
    event.preventDefault();
    this.otpDigits[index] = key;
    this.setBoxValue(index, key);
    this.error.set(null);
    if (index < 5) this.focusBox(index + 1);
    if (this.otpComplete) setTimeout(() => this.verifyOtp(), 150);
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    if (this.isLoading()) return;
    const pasted = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    for (let i = 0; i < 6; i++) {
      this.otpDigits[i] = pasted[i] ?? '';
      this.setBoxValue(i, this.otpDigits[i]);
    }
    const next = this.otpDigits.findIndex(d => d === '');
    this.focusBox(next === -1 ? 5 : next);
    if (this.otpComplete) setTimeout(() => this.verifyOtp(), 150);
  }

  private focusBox(i: number) {
    if (i < 0 || i > 5) return;
    this.otpInputs.get(i)?.nativeElement.focus();
  }

  private setBoxValue(i: number, v: string) {
    const el = this.otpInputs.get(i)?.nativeElement;
    if (el) el.value = v;
  }

  clearOtp() {
    this.otpDigits = ['', '', '', '', '', ''];
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
    if (this.resendSeconds() > 0) return;
    this.clearOtp();
    this.sendOtp();
  }

  goBack() {
    this.step.set('phone');
    this.error.set(null);
    this.devOtp.set(null);
    this.clearOtp();
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendSeconds.set(0);
  }
}
