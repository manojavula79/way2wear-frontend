import { Component, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../../core/services/session.service';
import { ChatSession } from '../../../core/models/message.model';
import { Router } from '@angular/router';

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

  sessions = this.sessionService.sessions;
  currentSessionId = this.sessionService.currentSessionId;

  onNewSession() {
    this.newSession.emit();
    this.closed.emit();
  }

  onSelectSession(session: ChatSession) {
    this.sessionSelected.emit(session.id);
    this.closed.emit();
  }

  onDeleteSession(event: Event, sessionId: string) {
    event.stopPropagation();
    this.sessionService.deleteSession(sessionId);
  }

  close() {
    this.closed.emit();
  }
  goHelp()  { this.closed.emit(); this.router.navigate(['/help']); }
  goTerms() { this.closed.emit(); this.router.navigate(['/terms']); }
}
