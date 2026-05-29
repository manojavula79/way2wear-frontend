import { Injectable, signal } from '@angular/core';

// Minimal typings for the Web Speech API (not in standard TS lib)
interface SpeechRecognitionResultItem { transcript: string; }
interface SpeechRecognitionAlt { 0: SpeechRecognitionResultItem; isFinal: boolean; length: number; }
interface SpeechRecognitionEventLike { resultIndex: number; results: SpeechRecognitionAlt[]; }

@Injectable({ providedIn: 'root' })
export class VoiceService {
  isListening = signal(false);
  isSupported = signal(false);

  private recognition: any = null;

  constructor() {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SR) {
      this.isSupported.set(true);
      this.recognition = new SR();
      this.recognition.continuous     = true;
      this.recognition.interimResults = true;
      this.recognition.lang           = 'en-IN';
    }
  }

  /**
   * Start listening. onText fires with the transcribed text (final chunks).
   * Returns false if not supported.
   */
  start(onText: (text: string) => void, onEnd?: () => void): boolean {
    if (!this.recognition) return false;

    this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalText += res[0].transcript;
        }
      }
      if (finalText) onText(finalText.trim());
    };

    this.recognition.onend = () => {
      this.isListening.set(false);
      onEnd?.();
    };

    this.recognition.onerror = () => {
      this.isListening.set(false);
      onEnd?.();
    };

    try {
      this.recognition.start();
      this.isListening.set(true);
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    if (this.recognition && this.isListening()) {
      this.recognition.stop();
      this.isListening.set(false);
    }
  }
}
