import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { MessageInputComponent, OutgoingMessage } from './message-input.component';
import { VoiceService } from '../../../core/services/voice.service';

class FakeVoiceService {
  isListening = signal(false);
  interim = signal('');
  supported = signal(true);
  error = signal<string | null>(null);

  private onText: ((full: string, isFinal: boolean) => void) | null = null;
  private onFinish: (() => void) | null = null;

  start = jasmine.createSpy('start').and.callFake(
    (onText: (full: string, isFinal: boolean) => void, onFinish?: () => void) => {
      this.onText = onText;
      this.onFinish = onFinish ?? null;
      this.isListening.set(true);
      return true;
    },
  );

  stop = jasmine.createSpy('stop').and.callFake(() => {
    if (!this.isListening()) return;
    this.isListening.set(false);
    const finish = this.onFinish;
    this.onText = null;
    this.onFinish = null;
    finish?.();
  });

  cancel = jasmine.createSpy('cancel').and.callFake(() => {
    if (!this.isListening()) return;
    this.isListening.set(false);
    this.onText = null;
    this.onFinish = null;
  });

  clearError = jasmine.createSpy('clearError');

  emitText(text: string) {
    this.onText?.(text, false);
  }
}

describe('MessageInputComponent voice input', () => {
  let fixture: ComponentFixture<MessageInputComponent>;
  let component: MessageInputComponent;
  let voice: FakeVoiceService;

  beforeEach(() => {
    voice = new FakeVoiceService();

    TestBed.configureTestingModule({
      imports: [MessageInputComponent],
      providers: [{ provide: VoiceService, useValue: voice }],
    });

    fixture = TestBed.createComponent(MessageInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  function query<T extends Element>(selector: string): T | null {
    return fixture.nativeElement.querySelector(selector) as T | null;
  }

  it('starts listening and shows a recording banner with live transcript', () => {
    const mic = query<HTMLButtonElement>('.mic');
    expect(mic?.disabled).toBeFalse();

    mic?.click();
    fixture.detectChanges();

    expect(voice.start).toHaveBeenCalled();
    expect(query('.rec-banner')).not.toBeNull();

    voice.emitText('date night outfit');
    fixture.detectChanges();

    expect(query('.rec-text')?.textContent).toContain('date night outfit');
  });

  it('sends the final voice transcript from the recording banner', () => {
    let emitted: OutgoingMessage | undefined;
    component.messageSent.subscribe(message => emitted = message);

    query<HTMLButtonElement>('.mic')?.click();
    fixture.detectChanges();
    voice.emitText('date night outfit');
    fixture.detectChanges();

    component.sendVoice();
    fixture.detectChanges();

    expect(voice.stop).toHaveBeenCalled();
    expect(emitted).toEqual({ text: 'date night outfit', image: undefined });
    expect(component.text()).toBe('');
  });

  it('restores the previous draft when recording is cancelled', () => {
    component.text.set('existing direction');

    component.toggleVoice();
    voice.emitText('accidental speech');
    fixture.detectChanges();

    expect(component.text()).toBe('existing direction accidental speech');

    component.cancelVoice();
    fixture.detectChanges();

    expect(voice.cancel).toHaveBeenCalled();
    expect(component.text()).toBe('existing direction');
    expect(query('.rec-banner')).toBeNull();
  });

  it('disables the mic when the browser does not support voice input', () => {
    voice.supported.set(false);
    fixture.detectChanges();

    expect(query<HTMLButtonElement>('.mic')?.disabled).toBeTrue();
  });

  it('shows voice errors and keeps the mic available for a retry', () => {
    voice.error.set('Microphone access is blocked.');
    fixture.detectChanges();

    expect(query('.voice-error')?.textContent).toContain('Microphone access is blocked.');
    expect(query<HTMLButtonElement>('.mic')?.disabled).toBeFalse();
  });
});
