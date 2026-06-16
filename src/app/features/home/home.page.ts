import {
  Component, OnInit, ViewChild, ElementRef,
  signal, computed, inject, AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatService }    from '../../core/services/chat.service';
import { SessionService } from '../../core/services/session.service';
import { Message }        from '../../core/models/message.model';

import { SideMenuComponent }        from '../../shared/components/side-menu/side-menu.component';
import { ProfilePanelComponent }    from '../../shared/components/profile-panel/profile-panel.component';
import { MessageBubbleComponent }   from '../../shared/components/message-bubble/message-bubble.component';
import { TypingIndicatorComponent } from '../../shared/components/typing-indicator/typing-indicator.component';
import { MessageInputComponent }    from '../../shared/components/message-input/message-input.component';
import { Outfit } from '../../core/models/message.model';
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
  async onMessageSent(text: string) {
    // ── Step 1: Ensure session exists FIRST ──
    if (!this.sessionService.currentSessionId()) {
      this.sessionService.createSession();
    }
    const sessionId = this.sessionService.currentSessionId()!;

    // ── Step 2: Add user message to UI immediately ──
    const userMsg: Message = {
      id:        this.chatService.generateId(),
      role:      'user',
      content:   text,
      timestamp: new Date(),
    };
    this.sessionService.addMessage(sessionId, userMsg);
    this.shouldScroll = true;

    // ── Step 3: Build history (exclude the message just added) ──
    const history = this.messages()
      .filter(m => m.id !== userMsg.id && !m.error)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      // ── Step 4: Call backend ──
      const result = await this.chatService.sendMessage(text, sessionId, history);

      // ── Step 5: Sync session ID if backend assigned a different one ──
      const activeSessionId = result.sessionId || sessionId;
      if (result.sessionId && result.sessionId !== sessionId) {
        this.sessionService.setCurrentSession(result.sessionId);
      }

      // ── Step 6: Add AI response ──
      const aiMsg: Message = {
        id:        result.messageId || this.chatService.generateId(),
        role:      'assistant',
        content:   JSON.stringify(result.response),
        timestamp: new Date(),
      };
      this.sessionService.addMessage(activeSessionId, aiMsg);
      this.sessionService.updateSessionTitleIfNew(activeSessionId, text);

    } catch (err: any) {
      const aiErrMsg: Message = {
        id:        this.chatService.generateId(),
        role:      'assistant',
        content:   JSON.stringify({
          message: err?.message?.includes('timed out')
            ? 'The AI is taking longer than usual. Please try again.'
            : "I'm having trouble right now. Please try again in a moment.",
          tip:     undefined,
          outfits: [],
        }),
        timestamp: new Date(),
        error:     true,
      };
      this.sessionService.addMessage(sessionId, aiErrMsg);
    }

    this.shouldScroll = true;
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
        (s.messages ?? []).forEach((m: any) => {
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
