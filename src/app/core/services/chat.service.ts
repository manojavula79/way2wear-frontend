import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OutfitResponse, ChatApiResponse } from '../models/message.model';

// ── System prompt for direct API calls ────────
const SYSTEM_PROMPT = `You are Way2Wear AI, an elite personal fashion stylist assistant.
Generate complete outfit recommendations based on user requests.

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "message": "2-3 sentence warm conversational styling advice",
  "tip": "one punchy actionable styling tip",
  "outfits": [
    {
      "id": "1",
      "name": "Outfit display name",
      "top": {
        "title": "Full product name",
        "brand": "Brand name (e.g. ZARA, H&M, Uniqlo, Ralph Lauren)",
        "price": 99,
        "color": "#1a3a5c",
        "url": "#product-top-1"
      },
      "bottom": {
        "title": "Full product name",
        "brand": "Brand name",
        "price": 79,
        "color": "#2c4a6e",
        "url": "#product-bottom-1"
      },
      "accessory": {
        "title": "Full product name",
        "brand": "Brand name",
        "price": 49,
        "color": "#8b5e3c",
        "url": "#product-accessory-1"
      },
      "note": "Why this combination works perfectly"
    }
  ]
}
Generate 2 outfit options. Consider occasion, budget, style preference.
Use realistic brand names and accurate hex color codes.
Respond ONLY with the JSON object.`;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);

  isLoading = signal(false);
  error     = signal<string | null>(null);

  private readonly API_TIMEOUT = 30000; // 30s for AI responses

  // ══════════════════════════════════════════
  // BACKEND MODE — calls your FastAPI server
  // Used when backend is running
  // ══════════════════════════════════════════
  async sendMessage(
    text: string,
    sessionId: string | null,
    history: Array<{ role: string; content: string }>
  ): Promise<{ response: OutfitResponse; sessionId: string; messageId: string }> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const res = await firstValueFrom(
        this.http.post<ChatApiResponse>(
          `${environment.apiUrl}/chat`,
          {
            message:    text,
            session_id: sessionId ?? undefined,
            history:    history.slice(-8),
          }
        ).pipe(timeout(this.API_TIMEOUT))
      );

      return {
        response:  this.parseResponse(res.response),
        sessionId: res.sessionId,
        messageId: res.messageId ?? "",
      };
    } catch (err: any) {
      const msg = this.getErrorMessage(err);
      this.error.set(msg);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  // ══════════════════════════════════════════
  // DIRECT MODE — calls Anthropic API directly
  // Used by home.page.ts as fallback / dev mode
  // ══════════════════════════════════════════
  async sendMessageDirect(
    text: string,
    history: Array<{ role: string; content: string }>
  ): Promise<OutfitResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const messages = [
        ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: text },
      ];

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1200,
          system:     SYSTEM_PROMPT,
          messages,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `API error ${res.status}`);
      }

      const data   = await res.json();
      const rawText = data.content?.[0]?.text ?? '{}';
      return this.parseResponse(rawText);

    } catch (err: any) {
      const msg = this.getErrorMessage(err);
      this.error.set(msg);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  // ══════════════════════════════════════════
  // SESSION ENDPOINTS
  // ══════════════════════════════════════════
  getSessions() {
    return this.http.get<any[]>(`${environment.apiUrl}/sessions`);
  }

  getSession(sessionId: string) {
    return this.http.get<any>(`${environment.apiUrl}/sessions/${sessionId}`);
  }

  createSession() {
    return this.http.post<any>(`${environment.apiUrl}/sessions`, {});
  }

  deleteSession(sessionId: string) {
    return this.http.delete<void>(`${environment.apiUrl}/sessions/${sessionId}`);
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  // Parse JSON response from AI — handles markdown fences etc.
  parseResponse(raw: string): OutfitResponse {
    try {
      const cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return {
        message: parsed.message || "Here are your outfit recommendations!",
        tip:     parsed.tip    || null,
        outfits: Array.isArray(parsed.outfits) ? parsed.outfits : [],
      };
    } catch {
      return {
        message: "I've prepared some outfit recommendations for you! Let me know if you'd like different styles.",
        tip:     undefined,
        outfits: [],
      };
    }
  }

  // Generate a unique message ID
  generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // Reset loading/error state
  resetState() {
    this.isLoading.set(false);
    this.error.set(null);
  }

  // Map errors to user-friendly messages
  private getErrorMessage(err: any): string {
    if (err?.name === 'TimeoutError') {
      return 'Request timed out. The AI is taking too long — please try again.';
    }
    if (err?.status === 0) {
      return 'Cannot reach the server. Check your internet connection.';
    }
    if (err?.status === 401) {
      return 'Session expired. Please log in again.';
    }
    if (err?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (err?.status === 500) {
      return 'Server error. Please try again in a moment.';
    }
    return err?.error?.detail || err?.message || 'Something went wrong. Please try again.';
  }
}
