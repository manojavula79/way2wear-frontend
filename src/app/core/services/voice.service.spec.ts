import { VoiceService } from './voice.service';

class FakeSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 1;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;

  start = jasmine.createSpy('start');
  stop = jasmine.createSpy('stop').and.callFake(() => this.onend?.());
  abort = jasmine.createSpy('abort');

  emitResult(transcript: string, isFinal: boolean) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript }, isFinal, length: 1 }],
    });
  }
}

describe('VoiceService', () => {
  const win = window as any;
  const originalSpeechRecognition = win.SpeechRecognition;
  const originalWebkitSpeechRecognition = win.webkitSpeechRecognition;

  beforeEach(() => {
    win.SpeechRecognition = FakeSpeechRecognition;
    win.webkitSpeechRecognition = undefined;
  });

  afterEach(() => {
    if (originalSpeechRecognition === undefined) {
      delete win.SpeechRecognition;
    } else {
      win.SpeechRecognition = originalSpeechRecognition;
    }

    if (originalWebkitSpeechRecognition === undefined) {
      delete win.webkitSpeechRecognition;
    } else {
      win.webkitSpeechRecognition = originalWebkitSpeechRecognition;
    }
  });

  function createService() {
    const service = new VoiceService();
    const recognition = (service as any).recognition as FakeSpeechRecognition;
    return { service, recognition };
  }

  it('delivers the final transcript when the user stops listening', () => {
    const { service, recognition } = createService();
    const calls: Array<[string, boolean]> = [];
    let finishCount = 0;

    const started = service.start(
      (text, isFinal) => calls.push([text, isFinal]),
      () => finishCount++,
    );

    expect(started).toBeTrue();
    expect(service.isListening()).toBeTrue();

    recognition.emitResult('date night', false);
    expect(calls[calls.length - 1]).toEqual(['date night', false]);

    recognition.emitResult('date night outfit', true);
    expect(calls[calls.length - 1]).toEqual(['date night outfit', false]);

    service.stop();

    expect(service.isListening()).toBeFalse();
    expect(calls[calls.length - 1]).toEqual(['date night outfit', true]);
    expect(finishCount).toBe(1);
  });

  it('reports microphone permission errors without disabling voice support', () => {
    const { service, recognition } = createService();
    service.start(() => {});

    recognition.onerror?.({ error: 'not-allowed' });

    expect(service.isListening()).toBeFalse();
    expect(service.supported()).toBeTrue();
    expect(service.error()).toContain('Microphone access is blocked');
  });

  it('discards the transcript when the session is cancelled', () => {
    const { service, recognition } = createService();
    let finalDelivered = false;

    service.start((_text, isFinal) => {
      if (isFinal) finalDelivered = true;
    });
    recognition.emitResult('some accidental speech', true);

    service.cancel();

    expect(service.isListening()).toBeFalse();
    expect(finalDelivered).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('reports unsupported browsers and refuses to start', () => {
    win.SpeechRecognition = undefined;
    win.webkitSpeechRecognition = undefined;

    const service = new VoiceService();

    expect(service.supported()).toBeFalse();
    expect(service.start(() => {})).toBeFalse();
    expect(service.error()).toContain('not supported');
  });
});
