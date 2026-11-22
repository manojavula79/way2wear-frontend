import { Injectable, signal } from '@angular/core';

type VoiceTextHandler = (full: string, isFinal: boolean) => void;
type VoiceFinishHandler = () => void;

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  readonly isListening = signal(false);
  readonly interim = signal('');           // live partial text while speaking
  readonly supported = signal(true);
  readonly error = signal<string | null>(null);

  private recognition: SpeechRecognitionLike | null = null;
  private finalText = '';
  private onText: VoiceTextHandler | null = null;
  private onFinish: VoiceFinishHandler | null = null;
  private manualStop = false;
  private sessionActive = false;
  private cancelled = false;

  constructor() {
    const win = typeof window === 'undefined'
      ? null
      : window as SpeechRecognitionWindow;
    const SpeechRecognitionCtor = win?.SpeechRecognition ?? win?.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      this.supported.set(false);
      return;
    }

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = true;        // keep listening until stopped
    this.recognition.interimResults = true;    // emit partial words live
    this.recognition.lang = 'en-IN';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event) => this.handleResult(event);
    this.recognition.onerror = (event) => this.handleError(event);
    this.recognition.onend = () => this.handleEnd();
  }

  /**
   * Begin listening. `onText` fires live and once more with the final transcript.
   * `onFinish` always fires when the session ends, including errors and cancellation.
   */
  start(onText: VoiceTextHandler, onFinish?: VoiceFinishHandler): boolean {
    if (!this.recognition) {
      this.error.set('Voice input is not supported in this browser. Please type your message instead.');
      return false;
    }
    if (this.sessionActive) return false;

    this.error.set(null);
    this.onText = onText;
    this.onFinish = onFinish ?? null;
    this.finalText = '';
    this.interim.set('');
    this.manualStop = false;
    this.cancelled = false;
    this.sessionActive = true;
    this.isListening.set(true);

    try {
      this.recognition.lang = this.detectLang();
      this.recognition.start();
      return true;
    } catch {
      this.sessionActive = false;
      this.isListening.set(false);
      this.interim.set('');
      this.onText = null;
      this.onFinish = null;
      this.error.set('Voice input could not start. Please try again.');
      return false;
    }
  }

  /** Stop recording and deliver the final transcript. */
  stop(): void {
    if (!this.recognition || !this.sessionActive) return;
    this.manualStop = true;
    try {
      this.recognition.stop();
    } catch {
      this.finishSession();
    }
  }

  /** Discard the current session without delivering its transcript. */
  cancel(): void {
    if (!this.recognition || !this.sessionActive) return;
    this.cancelled = true;
    this.manualStop = true;
    try {
      this.recognition.abort?.();
    } catch {
      // The session is finalized below even if the browser cannot abort it.
    }
    this.finishSession(false);
  }

  clearError(): void {
    this.error.set(null);
  }

  private handleResult(event: SpeechRecognitionEventLike): void {
    if (!this.sessionActive || this.cancelled) return;

    let interimChunk = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? '';

      if (result.isFinal) {
        const trimmed = transcript.trim();
        if (trimmed) {
          this.finalText += (this.finalText ? ' ' : '') + trimmed;
        }
      } else {
        interimChunk += transcript;
      }
    }

    this.interim.set(interimChunk);
    const full = (this.finalText + ' ' + interimChunk).trim();
    this.onText?.(full, false);
  }

  private handleError(event: SpeechRecognitionErrorEventLike): void {
    if (!this.sessionActive) return;

    const message = this.messageForError(event.error);
    if (message) this.error.set(message);

    this.manualStop = true;
    try {
      this.recognition?.abort?.();
    } catch {
      // Ignore abort failures; finishSession below cleans up the session.
    }

    // Keep any partial transcript so the user can review it instead of losing it.
    this.finishSession(event.error !== 'aborted');
  }

  private handleEnd(): void {
    if (!this.sessionActive) return;

    // The browser may stop on silence. Keep the session alive until the user stops.
    if (this.isListening() && !this.manualStop) {
      try {
        this.recognition?.start();
        return;
      } catch {
        // Fall through and finish cleanly if restart is not possible.
      }
    }

    this.finishSession();
  }

  private finishSession(deliverText = true): void {
    if (!this.sessionActive) return;

    const full = (this.finalText + ' ' + this.interim()).trim();
    const textHandler = this.onText;
    const finishHandler = this.onFinish;
    const wasCancelled = this.cancelled;

    this.sessionActive = false;
    this.manualStop = false;
    this.cancelled = false;
    this.isListening.set(false);
    this.interim.set('');
    this.finalText = '';
    this.onText = null;
    this.onFinish = null;

    if (deliverText && !wasCancelled && full) {
      textHandler?.(full, true);
    }
    finishHandler?.();
  }

  private messageForError(code: string): string | null {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Microphone access is blocked. Allow microphone access in your browser and try again.';
      case 'audio-capture':
        return 'No microphone was found. Check your device and try again.';
      case 'network':
        return 'Voice input needs an internet connection. Check your connection and try again.';
      case 'language-not-supported':
        return 'Voice input does not support your device language. Please type your message instead.';
      case 'no-speech':
        return 'No speech was detected. Tap the mic and try again.';
      case 'aborted':
        return null;
      default:
        return 'Voice input failed. Please try again.';
    }
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
