import {
  Component, Output, EventEmitter, ViewChild, ElementRef, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceService } from '../../../core/services/voice.service';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="input-area">
      <div class="input-bar">
        <button class="icon-btn" aria-label="New">+</button>
        <textarea #box rows="1" class="msg-input"
          placeholder="Send a message…"
          [disabled]="disabled"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"></textarea>
        <button class="icon-btn mic" [class.listening]="voice.isListening()"
          (click)="toggleVoice()" aria-label="Voice">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.6"/>
            <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="send-btn" [class.active]="text().trim().length > 0"
          [disabled]="!text().trim() || disabled" (click)="send()" aria-label="Send">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 12V2M7 2L2.5 6.5M7 2l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <p class="disclaimer">Way2Wear can make mistakes. Consider checking important info.</p>
    </div>
  `,
  styles: [`
    .input-area { padding: 10px 14px 16px; background:#fff; border-top:1px solid rgba(0,0,0,0.06); }
    .input-bar { display:flex; align-items:flex-end; gap:8px;
      background:#f6f5f2; border:1px solid rgba(0,0,0,0.08); border-radius:24px; padding:6px 8px 6px 14px; }
    .msg-input { flex:1; border:none; background:transparent; font-size:15px; font-family:inherit;
      resize:none; outline:none; max-height:140px; overflow-y:hidden; line-height:1.5; padding:6px 0; }
    .icon-btn { background:none; border:none; cursor:pointer; color:#8a8a8a; font-size:18px;
      padding:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .icon-btn.mic.listening { color:#dc3545; animation:pulse 1.2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
    .send-btn { width:32px; height:32px; border-radius:50%; border:none; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; cursor:pointer;
      background:transparent; color:#c0c0c0; transition:all .2s; }
    .send-btn.active { background:#1a1a1a; color:#fff; }
    .disclaimer { text-align:center; font-size:11px; color:#aeacaa; margin:7px 0 0; }
  `],
})
export class MessageInputComponent {
  @Output() messageSent = new EventEmitter<string>();
  @ViewChild('box') box!: ElementRef<HTMLTextAreaElement>;

  voice = inject(VoiceService);
  text = signal('');
  disabled = false;

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
    // Enter sends, Shift+Enter newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  toggleVoice() {
    if (this.voice.isListening()) { this.voice.stop(); return; }
    this.voice.start((t) => {
      const next = this.text() ? `${this.text()} ${t}` : t;
      this.text.set(next);
      const el = this.box?.nativeElement;
      if (el) { el.value = next; this.grow(el); }
    });
  }

  send() {
    const v = this.text().trim();
    if (!v) return;
    this.messageSent.emit(v);
    this.text.set('');
    const el = this.box?.nativeElement;
    if (el) { el.value = ''; el.style.height = 'auto'; }
    this.voice.stop();
  }
}
