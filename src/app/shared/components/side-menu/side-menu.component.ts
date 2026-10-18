import { Component, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../../core/services/session.service';
import { ChatSession } from '../../../core/models/message.model';
import { Router } from '@angular/router';
import { ChatService } from '@core/services/chat.service';

@Component({
  selector: 'app-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class SideMenuComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() sessionSelected = new EventEmitter<string>();
  @Output() newSession = new EventEmitter<void>();

  private router = inject(Router);

  private sessionService = inject(SessionService);
  private chatService = inject(ChatService);

  sessions = this.sessionService.sessions;
  currentSessionId = this.sessionService.currentSessionId;

  onNewSession() {
    this.newSession.emit();
    this.closed.emit();
  }

  onSelectSession(session: ChatSession) {
    console.log('selected session:', session.id);
    this.sessionSelected.emit(session.id);
    this.closed.emit();
  }

  onDeleteSession(event: Event, sessionId: string) {
    console.log('Deleting session:', sessionId);
    event.stopPropagation();
    this.sessionService.deleteSession(sessionId);
  }

  close() {
    this.closed.emit();
  }
  goHelp()  { this.closed.emit(); this.router.navigate(['/help']); }
  goTerms() { this.closed.emit(); this.router.navigate(['/terms']); }
}
