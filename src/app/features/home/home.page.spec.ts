import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { HomePage } from './home.page';
import { ChatService } from '../../core/services/chat.service';
import { SessionService } from '../../core/services/session.service';
import { environment } from '../../../environments/environment';

describe('HomePage dynamic form submission', () => {
  let fixture: ComponentFixture<HomePage>;
  let component: HomePage;
  let chatService: ChatService;
  let sessionService: SessionService;
  let httpMock: HttpTestingController;
  let sessionId: string;

  const originalQuery = "Suggest an outfit for my brother's wedding";
  const formContent = JSON.stringify({
    needs_form: true,
    form_type: 'other',
    message: 'Tell me about your brother.',
    form_fields: {
      gender: { type: 'buttons', options: ['Male', 'Female'], required: true },
      skin_tone: { type: 'buttons', options: ['Fair', 'Medium', 'Dark'], required: false },
      size: { type: 'dropdown', options: ['S', 'M', 'L'], required: false },
    },
  });

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    chatService = TestBed.inject(ChatService);
    sessionService = TestBed.inject(SessionService);
    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;

    const session = sessionService.createSession();
    sessionId = session.id;

    sessionService.addMessage(sessionId, {
      id: 'user-message-1',
      role: 'user',
      content: originalQuery,
      timestamp: new Date(),
    });
    sessionService.addMessage(sessionId, {
      id: 'form-message-1',
      role: 'assistant',
      content: formContent,
      timestamp: new Date(),
    });
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('re-sends the original query with person_profile and renders the result', async () => {
    const promise = component.onProfileFormSubmitted({
      sessionId,
      messageId: 'form-message-1',
      formType: 'other',
      formData: { gender: 'male', skin_tone: 'fair', size: 'm' },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/chat`);
    expect(req.request.body.message).toBe(originalQuery);
    expect(req.request.body.person_profile).toEqual({
      gender: 'male',
      skin_tone: 'fair',
      size: 'm',
    });
    expect(req.request.body.history.some((m: any) => String(m.content).includes('needs_form'))).toBeFalse();
    expect(req.request.body.history.some((m: any) => m.content === originalQuery)).toBeFalse();

    req.flush({
      session_id: sessionId,
      message_id: 'assistant-message-1',
      response: JSON.stringify({ message: 'Here are his outfits.', tip: null, outfits: [] }),
    });

    await promise;

    const messages = sessionService.sessions()
      .find(s => s.id === sessionId)?.messages ?? [];

    // The user query must not be duplicated in the visible chat.
    expect(messages.filter(m => m.role === 'user').length).toBe(1);
    expect(messages[messages.length - 1].content).toContain('Here are his outfits.');
    expect(chatService.isLoading()).toBeFalse();
  });

  it('shows a retryable error and clears loading when the request fails', async () => {
    const promise = component.onProfileFormSubmitted({
      sessionId,
      messageId: 'form-message-1',
      formType: 'other',
      formData: { gender: 'male' },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/chat`);
    req.flush({ detail: 'Rate limit exceeded.' }, { status: 429, statusText: 'Too Many Requests' });

    await promise;

    const messages = sessionService.sessions()
      .find(s => s.id === sessionId)?.messages ?? [];
    const last = messages[messages.length - 1];

    expect(last.error).toBeTrue();
    expect(last.content).toBe('Rate limit exceeded.');
    expect(last.content).not.toContain('{');
    expect(chatService.isLoading()).toBeFalse();
  });

  it('keeps the original query when the backend assigns the real session ID', async () => {
    const localSession = sessionService.createSession();

    const sendPromise = component.onMessageSent("Suggest an outfit for my brother's wedding");

    const sendReq = httpMock.expectOne(`${environment.apiUrl}/chat`);
    expect(sendReq.request.body.session_id).toBe(localSession.id);
    sendReq.flush({
      session_id: 'server-session-1',
      message_id: 'server-form-message',
      response: formContent,
    });

    await sendPromise;

    expect(sessionService.currentSessionId()).toBe('server-session-1');
    const afterSend = sessionService.currentSession()?.messages ?? [];
    expect(afterSend.map(m => m.role)).toEqual(['user', 'assistant']);
    expect(afterSend[0].content).toBe(originalQuery);
    expect(afterSend[1].content).toContain('needs_form');

    const formPromise = component.onProfileFormSubmitted({
      sessionId: 'server-session-1',
      messageId: 'server-form-message',
      formType: 'other',
      formData: { gender: 'male', skin_tone: 'fair', size: 'm' },
    });

    const formReq = httpMock.expectOne(`${environment.apiUrl}/chat`);
    expect(formReq.request.body.message).toBe(originalQuery);
    expect(formReq.request.body.person_profile).toEqual({
      gender: 'male',
      skin_tone: 'fair',
      size: 'm',
    });

    formReq.flush({
      session_id: 'server-session-1',
      message_id: 'server-assistant-message',
      response: JSON.stringify({ message: 'Here are his outfits.', outfits: [] }),
    });

    await formPromise;

    const finalMessages = sessionService.currentSession()?.messages ?? [];
    expect(finalMessages.filter(m => m.role === 'user').length).toBe(1);
    expect(finalMessages[finalMessages.length - 1].content).toContain('Here are his outfits.');
    expect(chatService.isLoading()).toBeFalse();
  });

  it('submits a self form as profile overrides instead of a person profile', async () => {
    const selfSession = sessionService.createSession();
    sessionService.addMessage(selfSession.id, {
      id: 'self-user-message',
      role: 'user',
      content: 'Style me for a wedding',
      timestamp: new Date(),
    });
    sessionService.addMessage(selfSession.id, {
      id: 'self-form-message',
      role: 'assistant',
      content: JSON.stringify({
        needs_form: true,
        form_type: 'self',
        message: 'Please tell me your gender.',
        form_fields: {
          gender: { type: 'buttons', options: ['Male', 'Female'], required: true },
        },
      }),
      timestamp: new Date(),
    });

    const promise = component.onProfileFormSubmitted({
      sessionId: selfSession.id,
      messageId: 'self-form-message',
      formType: 'self',
      formData: { gender: 'female' },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/chat`);
    expect(req.request.body.message).toBe('Style me for a wedding');
    expect(req.request.body.profile.gender).toBe('female');
    expect(req.request.body.person_profile).toBeUndefined();

    req.flush({
      session_id: selfSession.id,
      message_id: 'self-assistant-message',
      response: JSON.stringify({ message: 'Here is your look.', outfits: [] }),
    });

    await promise;
    expect(chatService.isLoading()).toBeFalse();
  });
});
