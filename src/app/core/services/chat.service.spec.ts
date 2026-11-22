import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { ChatService } from './chat.service';
import { environment } from '../../../environments/environment';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('sends the original query, person profile and submitted form values to /chat', async () => {
    const promise = service.sendMessage(
      "Suggest an outfit for my brother's wedding",
      'session-1',
      [],
      {
        personProfile: {
          gender: 'male',
          skin_tone: 'fair',
          size: 'm',
        },
      },
    );

    const req = httpMock.expectOne(`${environment.apiUrl}/chat`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.message).toBe("Suggest an outfit for my brother's wedding");
    expect(req.request.body.session_id).toBe('session-1');
    expect(req.request.body.person_profile).toEqual({
      gender: 'male',
      skin_tone: 'fair',
      size: 'm',
    });

    req.flush({
      session_id: 'session-1',
      message_id: 'message-1',
      response: JSON.stringify({ message: 'Here are some outfits', outfits: [] }),
    });

    const result = await promise;
    expect(result.response.message).toBe('Here are some outfits');
    expect(result.sessionId).toBe('session-1');
    expect(result.messageId).toBe('message-1');
    expect(service.isLoading()).toBeFalse();
  });

  it('merges self-form values into the account profile payload', async () => {
    const promise = service.sendMessage(
      'Suggest a date night outfit',
      'session-1',
      [],
      {
        profileOverrides: {
          gender: 'female',
          skinTone: 'medium',
          size: 's',
        },
      },
    );

    const req = httpMock.expectOne(`${environment.apiUrl}/chat`);
    expect(req.request.body.profile.gender).toBe('female');
    expect(req.request.body.profile.skinTone).toBe('medium');
    expect(req.request.body.person_profile).toBeUndefined();

    req.flush({
      session_id: 'session-1',
      message_id: 'message-2',
      response: JSON.stringify({ message: 'Try this', outfits: [] }),
    });

    await promise;
  });

  it('always clears isLoading when the request fails', async () => {
    const promise = service.sendMessage('hello', 'session-1', []);

    const req = httpMock.expectOne(`${environment.apiUrl}/chat`);
    expect(service.isLoading()).toBeTrue();

    req.flush({ detail: 'Rate limit exceeded.' }, { status: 429, statusText: 'Too Many Requests' });

    await expectAsync(promise).toBeRejected();
    expect(service.isLoading()).toBeFalse();
    expect(service.error()).toBe('Rate limit exceeded.');
  });

  it('preserves a needs_form payload through sendMessage so the UI can render the form', async () => {
    const formResponse: any = {
      needs_form: true,
      form_type: 'other',
      message: 'Tell me about your brother.',
      form_fields: {
        gender: { type: 'buttons', options: ['Male', 'Female'], required: true },
      },
    };

    const promise = service.sendMessage('Suggest an outfit for my brother', 'session-1', []);

    const req = httpMock.expectOne(`${environment.apiUrl}/chat`);
    req.flush({
      session_id: 'session-1',
      message_id: 'message-form',
      response: JSON.stringify(formResponse),
    });

    const result = await promise;
    expect(result.response).toEqual(formResponse);
    expect(service.isLoading()).toBeFalse();
  });

  it('classifies needs_form responses as a form without exposing raw JSON', () => {
    const raw = JSON.stringify({
      needs_form: true,
      form_type: 'other',
      message: 'Tell me about your brother.',
      form_fields: {
        gender: { type: 'buttons', options: ['Male', 'Female'], required: true },
      },
    });

    const content = service.parseAssistantContent(raw);
    expect(content.kind).toBe('form');
    if (content.kind === 'form') {
      expect(content.form.form_type).toBe('other');
      expect(content.form.message).toBe('Tell me about your brother.');
    }
  });

  it('keeps plain and malformed text visible instead of replacing it', () => {
    expect(service.parseAssistantContent('Let me style you')).toEqual({
      kind: 'text',
      text: 'Let me style you',
    });

    expect(service.parseAssistantContent('{not valid json')).toEqual({
      kind: 'text',
      text: '{not valid json',
    });
  });

  it('does not render unexpected JSON objects as chat text', () => {
    const content = service.parseAssistantContent('{"internal":"metadata"}');
    expect(content.kind).toBe('text');
    if (content.kind === 'text') {
      expect(content.text).not.toContain('"internal"');
    }
  });
});
