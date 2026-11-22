import {
  Component, Output, EventEmitter, ViewChild, ElementRef, inject, signal,
  Input, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceService } from '../../../core/services/voice.service';

export interface OutgoingMessage {
  text: string;
  image?: string;   // base64 data URL, optional
}

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="input-area">

      <!-- Image preview (above the bar) -->
      <div class="img-preview" *ngIf="imageData()">
        <img [src]="imageData()!" alt="attachment" />
        <button class="img-remove" (click)="removeImage()" aria-label="Remove image">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Voice recording banner -->
      <div class="rec-banner" *ngIf="voice.isListening()" role="status" aria-live="polite">
        <span class="rec-dot" aria-hidden="true"></span>
        <div class="rec-copy">
          <span class="rec-title">
            Listening
            <span class="rec-time">{{ formatElapsed(voiceElapsed()) }}</span>
          </span>
          <span class="rec-text">{{ text().trim() || voice.interim() || 'Speak now…' }}</span>
        </div>
        <div class="rec-actions">
          <button type="button" class="rec-cancel" (click)="cancelVoice()">Cancel</button>
          <button type="button" class="rec-send" (click)="sendVoice()">Send</button>
        </div>
      </div>

      <p class="voice-error" *ngIf="voice.error() && !voice.isListening()" role="alert">
        {{ voice.error() }}
      </p>

      <div class="input-bar">
        <!-- + add image -->
        <button class="icon-btn" (click)="pickImage()" aria-label="Add image"
          [disabled]="disabled || voice.isListening()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
        <input #fileInput type="file" accept="image/*" hidden (change)="onFileChosen($event)" />

        <textarea #box rows="1" class="msg-input"
          placeholder="Send a message…"
          [disabled]="disabled || voice.isListening()"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"></textarea>

        <!-- mic -->
        <button class="icon-btn mic" [class.listening]="voice.isListening()"
          [disabled]="disabled || !voice.supported()"
          [attr.title]="!voice.supported()
            ? 'Voice input is not supported in this browser'
            : (voice.isListening() ? 'Stop voice input' : 'Start voice input')"
          [attr.aria-label]="!voice.supported()
            ? 'Voice input is not supported in this browser'
            : (voice.isListening() ? 'Stop voice input' : 'Start voice input')"
          [attr.aria-pressed]="voice.isListening()"
          (click)="toggleVoice()">
          <svg *ngIf="!voice.isListening()" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.6"/>
            <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <svg *ngIf="voice.isListening()" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor"/>
          </svg>
        </button>

        <!-- send -->
        <button class="send-btn" [class.active]="canSend()"
          [disabled]="!canSend() || disabled" (click)="send()" aria-label="Send">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 12V2M7 2L2.5 6.5M7 2l4.5 4.5" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <p class="disclaimer">Way2Wear can make mistakes. Consider checking important info.</p>
    </div>
  `,
  styles: [`
    .input-area { padding:10px 14px 16px; background:#fff; border-top:1px solid rgba(0,0,0,0.06); }

    .img-preview { position:relative; width:64px; height:64px; margin:0 0 10px 6px;
      border-radius:12px; overflow:hidden; border:1px solid rgba(0,0,0,.1); }
    .img-preview img { width:100%; height:100%; object-fit:cover; }
    .img-remove { position:absolute; top:3px; right:3px; width:20px; height:20px; border-radius:50%;
      background:rgba(0,0,0,.6); border:none; cursor:pointer; display:flex;
      align-items:center; justify-content:center; padding:0; }

    .rec-banner { display:flex; align-items:center; gap:10px; background:#fdecec;
      border:1px solid rgba(220,53,69,.25); border-radius:14px; padding:9px 10px 9px 14px;
      margin-bottom:10px; }
    .rec-dot { width:9px; height:9px; border-radius:50%; background:#dc3545; flex-shrink:0;
      animation:pulse 1.1s infinite; }
    .rec-copy { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
    .rec-title { display:flex; align-items:center; gap:7px; font-size:.68rem; font-weight:700;
      letter-spacing:.06em; text-transform:uppercase; color:#b02a37; }
    .rec-time { font-size:.72rem; font-weight:600; letter-spacing:0; color:#7a2a2a;
      font-variant-numeric:tabular-nums; }
    .rec-text { font-size:.85rem; color:#7a2a2a; overflow:hidden;
      text-overflow:ellipsis; white-space:nowrap; }
    .rec-actions { display:flex; align-items:center; gap:4px; flex-shrink:0; }
    .rec-cancel { background:transparent; color:#7a2a2a; border:none; border-radius:8px;
      padding:6px 8px; font-size:.8rem; font-weight:600; cursor:pointer; }
    .rec-cancel:hover { background:rgba(220,53,69,.1); }
    .rec-send { background:#dc3545; color:#fff; border:none; border-radius:999px;
      padding:6px 14px; font-size:.8rem; font-weight:600; cursor:pointer; }
    .rec-send:hover { background:#c82333; }
    @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.35;} }

    .voice-error { margin:0 4px 8px; font-size:12px; line-height:1.4; color:#b02a37; }

    .input-bar { display:flex; align-items:flex-end; gap:6px;
      background:#f6f5f2; border:1px solid rgba(0,0,0,0.08); border-radius:24px; padding:6px 8px 6px 10px; }
    .msg-input { flex:1; border:none; background:transparent; font-size:15px; font-family:inherit;
      resize:none; outline:none; max-height:140px; overflow-y:hidden; line-height:1.5; padding:6px 0; }
    .msg-input:disabled { opacity:.7; cursor:not-allowed; }
    .icon-btn { background:none; border:none; cursor:pointer; color:#8a8a8a;
      padding:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
      border-radius:50%; transition:color .15s, background .15s, opacity .15s; }
    .icon-btn:disabled { opacity:.4; cursor:not-allowed; }
    .icon-btn.mic.listening { color:#dc3545; background:rgba(220,53,69,.1); }
    .send-btn { width:32px; height:32px; border-radius:50%; border:none; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; cursor:pointer;
      background:transparent; color:#c0c0c0; transition:all .2s; }
    .send-btn.active { background:#1a1a1a; color:#fff; }
    .disclaimer { text-align:center; font-size:11px; color:#aeacaa; margin:7px 0 0; }
  `],
})
export class MessageInputComponent implements OnDestroy {
  @Output() messageSent = new EventEmitter<OutgoingMessage>();
  @ViewChild('box') box!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @Input() disabled = false;

  voice = inject(VoiceService);
  text = signal('');
  imageData = signal<string | null>(null);
  voiceElapsed = signal(0);

  private textBeforeVoice = '';
  private sendAfterVoice = false;
  private voiceTimer: number | null = null;

  ngOnDestroy(): void {
    this.sendAfterVoice = false;
    this.voice.cancel();
    this.stopVoiceTimer();
  }

  canSend() {
    return !this.voice.isListening() && (this.text().trim().length > 0 || !!this.imageData());
  }

  // ── Typing / auto-grow ──
  onInput(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    this.text.set(el.value);
    this.grow(el);
  }
  private grow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    const max = 140;
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }
  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  // ── Voice ──
  toggleVoice() {
    if (this.disabled) return;

    if (this.voice.isListening()) {
      this.sendAfterVoice = false;
      this.voice.stop();
      return;
    }
    this.startVoice();
  }

  private startVoice() {
    this.textBeforeVoice = this.text().trim();
    this.sendAfterVoice = false;

    const started = this.voice.start(
      (full) => this.applyVoiceText(full),
      () => this.onVoiceFinished(),
    );

    if (started && this.voice.isListening()) {
      this.startVoiceTimer();
    }
  }

  private applyVoiceText(full: string) {
    const combined = this.textBeforeVoice
      ? `${this.textBeforeVoice} ${full}`.trim()
      : full;
    this.text.set(combined);
    const el = this.box?.nativeElement;
    if (el) { el.value = combined; this.grow(el); }
  }

  /** Send the current transcript once the browser has delivered the final result. */
  sendVoice() {
    if (!this.voice.isListening()) {
      this.send();
      return;
    }
    this.sendAfterVoice = true;
    this.voice.stop();
  }

  cancelVoice() {
    this.sendAfterVoice = false;
    this.voice.cancel();
    this.text.set(this.textBeforeVoice);
    const el = this.box?.nativeElement;
    if (el) {
      el.value = this.textBeforeVoice;
      this.grow(el);
    }
    this.stopVoiceTimer();
  }

  private onVoiceFinished() {
    this.stopVoiceTimer();

    // Never auto-send a partial transcript after a recognition or permission error.
    const shouldSend = this.sendAfterVoice && !this.voice.error();
    this.sendAfterVoice = false;

    if (shouldSend && (this.text().trim() || this.imageData())) {
      this.send();
    }
  }

  private startVoiceTimer() {
    this.stopVoiceTimer();
    this.voiceElapsed.set(0);
    this.voiceTimer = window.setInterval(() => {
      this.voiceElapsed.update(seconds => seconds + 1);
    }, 1000);
  }

  private stopVoiceTimer() {
    if (this.voiceTimer !== null) {
      window.clearInterval(this.voiceTimer);
      this.voiceTimer = null;
    }
  }

  formatElapsed(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ── Image attach ──
  pickImage() { this.fileInput?.nativeElement.click(); }

  onFileChosen(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => this.imageData.set(reader.result as string); // replaces any previous
    reader.readAsDataURL(file);
    input.value = ''; // allow re-picking same file later
  }

  removeImage() {
    this.imageData.set(null);
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  // ── Send ──
  send() {
    if (this.disabled || this.voice.isListening()) return;

    const v = this.text().trim();
    const img = this.imageData();
    if (!v && !img) return;

    this.messageSent.emit({ text: v, image: img ?? undefined });

    this.text.set('');
    this.imageData.set(null);
    const el = this.box?.nativeElement;
    if (el) { el.value = ''; el.style.height = 'auto'; }
    this.voice.stop();
  }
}
