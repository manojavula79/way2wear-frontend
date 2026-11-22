import {
  Component, OnInit, ViewChild, ElementRef,
  signal, computed, inject, AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatService, SendMessageOptions }    from '../../core/services/chat.service';
import { SessionService } from '../../core/services/session.service';
import {
  Message,
  Outfit,
  ProfileFormSubmission,
} from '../../core/models/message.model';

import { SideMenuComponent }        from '../../shared/components/side-menu/side-menu.component';
import { ProfilePanelComponent }    from '../../shared/components/profile-panel/profile-panel.component';
import { MessageBubbleComponent }   from '../../shared/components/message-bubble/message-bubble.component';
import { TypingIndicatorComponent } from '../../shared/components/typing-indicator/typing-indicator.component';
import { MessageInputComponent,OutgoingMessage }    from '../../shared/components/message-input/message-input.component';
import { OutfitDetailComponent } from '@shared/components/outfit-detail/outfit-detail.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SideMenuComponent, ProfilePanelComponent,
    MessageBubbleComponent, TypingIndicatorComponent, MessageInputComponent,
    OutfitDetailComponent
  ],
})
export class HomePage implements OnInit, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEndRef!: ElementRef;

  private chatService    = inject(ChatService);
  private sessionService = inject(SessionService);

  sideMenuOpen = signal(false);
  profileOpen  = signal(false);
  selectedOutfit = signal<Outfit | null>(null);
  isLoading    = this.chatService.isLoading;

  currentSession = this.sessionService.currentSession;
  sessions       = this.sessionService.sessions;
  messages       = computed(() => this.currentSession()?.messages ?? []);
  hasMessages    = computed(() => this.messages().length > 0);

  suggestions = [
    "Suggest outfits for my brother's wedding",
    'Smart casual office outfits under $300',
    'Modern minimalist weekend look',
    'Date night outfit ideas',
  ];

  private shouldScroll = false;

  ngOnInit() {
    this.loadSessionsFromBackend();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private loadSessionsFromBackend() {
    this.chatService.getSessions().subscribe({
      next: (backendSessions) => {
        backendSessions.forEach(s => {
          const exists = this.sessionService.sessions().find(l => l.id === s.id);
          if (!exists) {
            this.sessionService.addBackendSession({
              id: s.id, title: s.title, messages: [],
              createdAt: new Date(s.created_at),
              updatedAt: new Date(s.updated_at),
            });
          }
        });
        const all = this.sessionService.sessions();
        if (all.length > 0 && !this.sessionService.currentSessionId()) {
          this.sessionService.setCurrentSession(all[0].id);
        }
      },
      error: () => {
        const existing = this.sessionService.sessions();
        if (existing.length > 0 && !this.sessionService.currentSessionId()) {
          this.sessionService.setCurrentSession(existing[0].id);
        }
      }
    });
  }

  // ══════════════════════════════════════
  // SEND MESSAGE
  // ══════════════════════════════════════
  async onMessageSent(payload: OutgoingMessage | string) {
    // Prevent duplicate requests while the previous one is still running.
    if (this.chatService.isLoading()) return;

    // ── Step 1: Ensure session exists FIRST ──
    const text  = typeof payload === 'string' ? payload : payload.text;
    const image = typeof payload === 'string' ? undefined : payload.image;

    if (!text?.trim() && !image) return;
    if (!this.sessionService.currentSessionId()) {
      this.sessionService.createSession();
    }
    const sessionId = this.sessionService.currentSessionId()!;

    // ── Step 2: Build history before the new message is added ──
    const history = this.buildHistory();

    // ── Step 3: Add user message to UI immediately ──
    const userMsg: Message = {
      id:        this.chatService.generateId(),
      role:      'user',
      content:   text,
      image,
      timestamp: new Date(),
    };
    this.sessionService.addMessage(sessionId, userMsg);
    this.shouldScroll = true;

    await this.requestAssistantResponse(text, sessionId, history);
  }

  // ══════════════════════════════════════
  // DYNAMIC FORM SUBMISSION
  // ══════════════════════════════════════
  async onProfileFormSubmitted(event: ProfileFormSubmission) {
    // Skip does not call the API and must not leave the form loading.
    if (event.action === 'skip') return;
    if (!event.formData || this.chatService.isLoading()) return;

    const sessionId = event.sessionId || this.sessionService.currentSessionId();
    if (!sessionId) return;

    const messages = this.messages();
    const formIndex = messages.findIndex(m => m.id === event.messageId);
    const originalUserMessage = this.findPreviousUserMessage(messages, formIndex);

    if (!originalUserMessage) {
      this.addErrorMessage(sessionId, 'I lost track of your original request. Please send it again.');
      return;
    }

    const originalText = originalUserMessage.content.trim();
    if (!originalText) return;

    // The original query is being re-sent as the current message, so keep it
    // out of history. The form JSON itself is never sent to the model.
    const history = this.buildHistory({
      beforeMessageId: event.messageId,
      excludeIds: [originalUserMessage.id],
    });

    const formData = event.formData;
    const options: SendMessageOptions = event.formType === 'self'
      ? {
          profileOverrides: {
            gender: formData.gender ?? null,
            skinTone: formData.skin_tone ?? null,
            size: formData.size ?? null,
          },
        }
      : {
          personProfile: {
            gender: formData.gender ?? null,
            skin_tone: formData.skin_tone ?? null,
            size: formData.size ?? null,
          },
        };

    await this.requestAssistantResponse(originalText, sessionId, history, options);
  }

  onSuggestionClick(s: string) { this.onMessageSent(s); }

  onNewSession() {
    this.sessionService.createSession();
    this.sideMenuOpen.set(false);
  }

  onSessionSelected(sessionId: string) {
    this.sessionService.setCurrentSession(sessionId);
    this.sideMenuOpen.set(false);
    this.loadSessionMessages(sessionId);
  }

  private loadSessionMessages(sessionId: string) {
    const session = this.sessionService.sessions().find(s => s.id === sessionId);
    if (session && session.messages.length > 0) return;
    this.chatService.getSession(sessionId).subscribe({
      next: (s) => {
        (s?.messages ?? []).forEach((m: any) => {
          this.sessionService.addMessage(sessionId, {
            id: m.id, role: m.role, content: m.content,
            timestamp: new Date(m.created_at),
          });
        });
        this.shouldScroll = true;
      },
      error: () => {}
    });
  }

  // ══════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════
  private async requestAssistantResponse(
    text: string,
    sessionId: string,
    history: Array<{ role: string; content: string }>,
    options: SendMessageOptions = {},
  ): Promise<void> {
    try {
      const result = await this.chatService.sendMessage(text, sessionId, history, options);

      // Sync session ID if backend assigned a different one. Migrate the
      // optimistic local session so the original user message stays with it.
      const activeSessionId = result.sessionId || sessionId;
      if (result.sessionId && result.sessionId !== sessionId) {
        this.sessionService.adoptBackendSession(sessionId, result.sessionId);
      }

      const aiMsg: Message = {
        id:        result.messageId || this.chatService.generateId(),
        role:      'assistant',
        content:   JSON.stringify(result.response),
        timestamp: new Date(),
      };
      this.sessionService.addMessage(activeSessionId, aiMsg);
      this.sessionService.updateSessionTitleIfNew(activeSessionId, text);
    } catch (err: any) {
      // Keep the error human-readable; never render internal JSON in the UI.
      this.addErrorMessage(sessionId, this.errorMessage(err));
    } finally {
      // ChatService also clears its own isLoading in a finally block. This
      // covers every early/error path for the form's submitting state.
      this.shouldScroll = true;
    }
  }

  private addErrorMessage(sessionId: string, text: string): void {
    const aiErrMsg: Message = {
      id:        this.chatService.generateId(),
      role:      'assistant',
      content:   text,
      timestamp: new Date(),
      error:     true,
    };
    this.sessionService.addMessage(sessionId, aiErrMsg);
    this.shouldScroll = true;
  }

  private errorMessage(err: any): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;

    if (err?.message?.includes('timed out')) {
      return 'The AI is taking longer than usual. Please try again.';
    }

    return "I'm having trouble right now. Please try again in a moment.";
  }

  /**
   * Build compact model history. Assistant form JSON is replaced with its
   * human-readable prompt, and outfit metadata is reduced to the message text
   * so internal payloads never reach the model or the UI.
   */
  private buildHistory(options: {
    beforeMessageId?: string;
    excludeIds?: string[];
  } = {}): Array<{ role: string; content: string }> {
    let list = this.messages();

    if (options.beforeMessageId) {
      const index = list.findIndex(m => m.id === options.beforeMessageId);
      if (index >= 0) list = list.slice(0, index);
    }

    const excluded = new Set(options.excludeIds ?? []);

    return list
      .filter(m => !m.error && !excluded.has(m.id))
      .slice(-10)
      .map(m => {
        if (m.role === 'user') {
          return { role: m.role, content: m.content };
        }

        const content = this.chatService.parseAssistantContent(m.content);
        if (content.kind === 'form') {
          return { role: m.role, content: content.form.message };
        }
        if (content.kind === 'text') {
          return { role: m.role, content: content.text };
        }
        return { role: m.role, content: content.response.message };
      })
      .filter(m => m.content.trim().length > 0)
      .slice(-8);
  }

  private findPreviousUserMessage(messages: Message[], formIndex: number): Message | undefined {
    const start = formIndex >= 0 ? formIndex - 1 : messages.length - 1;
    for (let i = start; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i];
    }
    return undefined;
  }

  private scrollToBottom() {
    try { this.messagesEndRef?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); }
    catch {}
  }

  trackById(_: number, msg: Message): string { return msg.id; }

  toggleSideMenu() { this.sideMenuOpen.update(v => !v); }
  closeSideMenu()  { this.sideMenuOpen.set(false); }
  toggleProfile()  { this.profileOpen.update(v => !v); }
  closeProfile()   { this.profileOpen.set(false); }
}
