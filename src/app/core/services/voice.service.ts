import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class VoiceService {
  isListening = signal(false);
  interim = signal('');           // live partial text while speaking
  supported = signal(true);

  private recognition: any = null;
  private finalText = '';
  private onText: ((full: string, isFinal: boolean) => void) | null = null;
  private manualStop = false;

  constructor() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { this.supported.set(false); return; }

    this.recognition = new SR();
    this.recognition.continuous = true;        // keep listening until stopped
    this.recognition.interimResults = true;    // emit partial words live
    this.recognition.lang = 'en-IN';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalText += (this.finalText ? ' ' : '') + transcript.trim();
        } else {
          interimChunk += transcript;
        }
      }
      this.interim.set(interimChunk);
      const full = (this.finalText + ' ' + interimChunk).trim();
      this.onText?.(full, false);
    };

    this.recognition.onerror = (e: any) => {
      // 'no-speech' / 'aborted' are normal; don't treat as fatal
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.supported.set(false);
      }
      this.stop();
    };

    this.recognition.onend = () => {
      // Browser auto-stops after silence; if the user hasn't tapped stop, restart
      if (this.isListening() && !this.manualStop) {
        try { this.recognition.start(); return; } catch {}
      }
      this.finishSession();
    };
  }

  /** Begin listening. onText(fullText, isFinal) fires live and once more on stop. */
  start(onText: (full: string, isFinal: boolean) => void) {
    if (!this.recognition || this.isListening()) return;
    this.onText = onText;
    this.finalText = '';
    this.manualStop = false;
    this.interim.set('');
    try {
      this.recognition.lang = this.detectLang();
      this.recognition.start();
      this.isListening.set(true);
    } catch { /* already started */ }
  }

  stop() {
    if (!this.recognition) return;
    this.manualStop = true;
    try { this.recognition.stop(); } catch {}
  }

  private finishSession() {
    const full = (this.finalText + ' ' + this.interim()).trim();
    this.isListening.set(false);
    this.interim.set('');
    if (full) this.onText?.(full, true);  // deliver final text
    this.onText = null;
    this.finalText = '';
  }

  /** Best-effort language guess from device locale (Indian languages supported by Chrome). */
  private detectLang(): string {
    const l = (navigator.language || 'en-IN').toLowerCase();
    if (l.startsWith('te')) return 'te-IN';
    if (l.startsWith('hi')) return 'hi-IN';
    if (l.startsWith('ta')) return 'ta-IN';
    if (l.startsWith('kn')) return 'kn-IN';
    if (l.startsWith('ml')) return 'ml-IN';
    return 'en-IN';
  }
}
