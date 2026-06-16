import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UserService } from './user.service';

export interface OutfitItemApi {
  title: string; brand?: string; price?: number; currency?: string;
  color?: string; image?: string; url?: string;
}
export interface OutfitApi {
  id: string; name: string; note?: string; shoe_note?: string;
  top: OutfitItemApi; bottom: OutfitItemApi;
}
export interface OutfitResponse {
  message: string; tip?: string | null; outfits: OutfitApi[];
}
interface ChatApiResponse {
  session_id: string; message_id: string; response: string; outfit_data?: any;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private userService = inject(UserService);

  isLoading = signal(false);
  error = signal<string | null>(null);

  async sendMessage(
    text: string,
    sessionId: string | null,
    history: Array<{ role: string; content: string }>,
  ): Promise<{ response: OutfitResponse; sessionId: string; messageId: string }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // Send the FULL profile so AI respects account settings every time
      const p = this.userService.profile();
      const profile = {
        gender: p.gender,
        stylePreference: p.stylePreference,
        fitType: p.fitType,
        skinTone: p.skinTone,
        heightCm: p.heightCm,
        budgetRange: p.budgetRange,
      };

      const res = await this.http.post<ChatApiResponse>(`${environment.apiUrl}/chat`, {
        message: text,
        session_id: sessionId ?? undefined,
        history: history.slice(-8),
        profile,
      }).toPromise();

      if (!res) throw new Error('Empty response');
      return {
        response: this.parseResponse(res.response),
        sessionId: res.session_id,
        messageId: res.message_id ?? '',
      };
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Unable to connect. Please try again.');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  getSessions() { return this.http.get<any[]>(`${environment.apiUrl}/sessions`); }
  getSession(id: string) { return this.http.get<any>(`${environment.apiUrl}/sessions/${id}`); }
  deleteSession(id: string) { return this.http.delete<void>(`${environment.apiUrl}/sessions/${id}`); }

  parseResponse(raw: string): OutfitResponse {
    try {
      return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch {
      return { message: 'Let me style you! Describe the occasion.', tip: null, outfits: [] };
    }
  }

  generateId(): string { return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
  resetState() { this.isLoading.set(false); this.error.set(null); }
}
