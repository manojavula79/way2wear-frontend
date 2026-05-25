import { Injectable, signal, computed } from '@angular/core';
import { ChatSession, Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly STORAGE_KEY = 'w2w_sessions';

  private _sessions         = signal<ChatSession[]>(this.loadSessions());
  private _currentSessionId = signal<string | null>(null);

  sessions         = computed(() => this._sessions());
  currentSessionId = computed(() => this._currentSessionId());
  currentSession   = computed(() =>
    this._sessions().find(s => s.id === this._currentSessionId()) ?? null
  );

  // ── Create new session ────────────────
  createSession(): ChatSession {
    const session: ChatSession = {
      id:        `session_${Date.now()}`,
      title:     'New Style Session',
      messages:  [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this._sessions.update(s => [session, ...s]);
    this._currentSessionId.set(session.id);
    this.persist();
    return session;
  }

  // ── Add session from backend ──────────
  addBackendSession(session: ChatSession) {
    const exists = this._sessions().find(s => s.id === session.id);
    if (exists) return;
    this._sessions.update(s => [session, ...s]);
    this.persist();
  }

  // ── Set active session ────────────────
  setCurrentSession(id: string) {
    this._currentSessionId.set(id);
  }

  // ── Add message ───────────────────────
  addMessage(sessionId: string, message: Message) {
    // If session doesn't exist locally, create a shell for it
    const exists = this._sessions().find(s => s.id === sessionId);
    if (!exists) {
      this._sessions.update(s => [{
        id:        sessionId,
        title:     'New Style Session',
        messages:  [message],
        createdAt: new Date(),
        updatedAt: new Date(),
      }, ...s]);
      this._currentSessionId.set(sessionId);
      this.persist();
      return;
    }

    this._sessions.update(sessions =>
      sessions.map(s => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          messages:  [...s.messages, message],
          updatedAt: new Date(),
        };
      })
    );
    this.persist();
  }

  // ── Auto-title from first user message ─
  updateSessionTitleIfNew(sessionId: string, text: string) {
    this._sessions.update(sessions =>
      sessions.map(s => {
        if (s.id !== sessionId) return s;
        if (s.title !== 'New Style Session') return s;
        return {
          ...s,
          title: text.slice(0, 50) + (text.length > 50 ? '…' : ''),
        };
      })
    );
    this.persist();
  }

  // ── Delete session ────────────────────
  deleteSession(id: string) {
    this._sessions.update(s => s.filter(s => s.id !== id));
    if (this._currentSessionId() === id) {
      const remaining = this._sessions();
      this._currentSessionId.set(remaining[0]?.id ?? null);
    }
    this.persist();
  }

  // ── Clear all ─────────────────────────
  clearAll() {
    this._sessions.set([]);
    this._currentSessionId.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // ── Persistence ───────────────────────
  private persist() {
    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this._sessions().slice(0, 10))
      );
    } catch {}
  }

  private loadSessions(): ChatSession[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw).map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        messages:  (s.messages ?? []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
      }));
    } catch {
      return [];
    }
  }
}
