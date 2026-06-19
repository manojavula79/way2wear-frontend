import {
  Component, Output, EventEmitter, ViewChild, ElementRef, inject, signal,
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

      <!-- Recording banner -->
      <div class="rec-banner" *ngIf="voice.isListening()">
        <span class="rec-dot"></span>
        <span class="rec-text">{{ voice.interim() || 'Listening…' }}</span>
        <button class="rec-stop" (click)="toggleVoice()">Stop</button>
      </div>

      <div class="input-bar">
        <!-- + add image -->
        <button class="icon-btn" (click)="pickImage()" aria-label="Add image">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
        <input #fileInput type="file" accept="image/*" hidden (change)="onFileChosen($event)" />

        <textarea #box rows="1" class="msg-input"
          placeholder="Send a message…"
          [disabled]="disabled"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"></textarea>

        <!-- mic -->
        <button class="icon-btn mic" style="display:none !important;" [class.listening]="voice.isListening()"
          *ngIf="voice.supported()"
          (click)="toggleVoice()" aria-label="Voice">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.6"/>
            <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
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

    .rec-banner { display:flex; align-items:center; gap:9px; background:#fdecec;
      border:1px solid rgba(220,53,69,.25); border-radius:14px; padding:9px 14px; margin-bottom:10px; }
    .rec-dot { width:9px; height:9px; border-radius:50%; background:#dc3545; flex-shrink:0;
      animation:pulse 1.1s infinite; }
    .rec-text { flex:1; font-size:.85rem; color:#7a2a2a; overflow:hidden;
      text-overflow:ellipsis; white-space:nowrap; }
    .rec-stop { background:#dc3545; color:#fff; border:none; border-radius:8px;
      padding:5px 14px; font-size:.8rem; font-weight:600; cursor:pointer; }
    @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.35;} }

    .input-bar { display:flex; align-items:flex-end; gap:6px;
      background:#f6f5f2; border:1px solid rgba(0,0,0,0.08); border-radius:24px; padding:6px 8px 6px 10px; }
    .msg-input { flex:1; border:none; background:transparent; font-size:15px; font-family:inherit;
      resize:none; outline:none; max-height:140px; overflow-y:hidden; line-height:1.5; padding:6px 0; }
    .icon-btn { background:none; border:none; cursor:pointer; color:#8a8a8a;
      padding:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .icon-btn.mic.listening { color:#dc3545; }
    .send-btn { width:32px; height:32px; border-radius:50%; border:none; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; cursor:pointer;
      background:transparent; color:#c0c0c0; transition:all .2s; }
    .send-btn.active { background:#1a1a1a; color:#fff; }
    .disclaimer { text-align:center; font-size:11px; color:#aeacaa; margin:7px 0 0; }
  `],
})
export class MessageInputComponent {
  @Output() messageSent = new EventEmitter<OutgoingMessage>();
  @ViewChild('box') box!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  voice = inject(VoiceService);
  text = signal('');
  imageData = signal<string | null>(null);
  disabled = false;

  private textBeforeVoice = '';

  canSend() { return this.text().trim().length > 0 || !!this.imageData(); }

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
    if (this.voice.isListening()) { this.voice.stop(); return; }
    this.textBeforeVoice = this.text().trim();
    this.voice.start((full, _isFinal) => {
      const combined = this.textBeforeVoice
        ? `${this.textBeforeVoice} ${full}`.trim()
        : full;
      this.text.set(combined);
      const el = this.box?.nativeElement;
      if (el) { el.value = combined; this.grow(el); }
    });
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
