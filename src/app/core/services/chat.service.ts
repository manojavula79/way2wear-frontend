import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserService } from './user.service';
import { DynamicFormResponse } from '../models/message.model';

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

export interface PersonProfile {
  gender?: string | null;
  skin_tone?: string | null;
  size?: string | null;
}

export interface SendMessageOptions {
  /** Details about the person being styled when they are not the account owner. */
  personProfile?: PersonProfile;
  /** Values from a dynamic form that should override the account profile (self form). */
  profileOverrides?: Partial<{
    gender: string | null;
    skinTone: string | null;
    size: string | null;
  }>;
}

export type AssistantContent =
  | { kind: 'form'; form: DynamicFormResponse }
  | { kind: 'outfits'; response: OutfitResponse }
  | { kind: 'text'; text: string };

export type OutfitPayload = OutfitResponse | DynamicFormResponse;

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
    options: SendMessageOptions = {},
  ): Promise<{ response: OutfitPayload; sessionId: string; messageId: string }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // Send the FULL profile so AI respects account settings every time
      const p = this.userService.profile();
      const profile: Record<string, unknown> = {
        gender: p.gender,
        age:    p.age,
        stylePreference: p.stylePreference,
        fitType: p.fitType,
        skinTone: p.skinTone,
        heightCm: p.heightCm,
        budgetRange: p.budgetRange,
        ...this.cleanObject(options.profileOverrides),
      };

      const body: Record<string, unknown> = {
        message: text,
        session_id: sessionId ?? undefined,
        history: history.slice(-8),
        profile,
      };

      const personProfile = this.cleanObject(options.personProfile);
      if (Object.keys(personProfile).length > 0) {
        body['person_profile'] = personProfile;
      }

      const res = await firstValueFrom(
        this.http.post<ChatApiResponse>(`${environment.apiUrl}/chat`, body),
      );

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
  deleteSession(id: string) {console.log(id); return this.http.delete<void>(`${environment.apiUrl}/sessions/${id}`); }

  /**
   * Classifies an assistant message without ever leaking an internal JSON
   * payload into the chat UI.
   *
   * - requires a dynamic form -> structured form
   * - normal outfit/text payload -> outfit response
   * - malformed or plain text -> raw text so legitimate messages are not lost
   */
  parseAssistantContent(raw: string): AssistantContent {
    const text = typeof raw === 'string' ? raw : String(raw ?? '');
    const trimmed = text.trim();
    const parsed = this.tryParseJson(trimmed);

    if (parsed === undefined) {
      // Not JSON (or malformed JSON) — show it as text.
      return { kind: 'text', text: trimmed };
    }

    if (this.isPlainObject(parsed)) {
      const obj = parsed as Record<string, unknown>;

      if (obj['needs_form'] === true || obj['needs_form'] === 'true') {
        return {
          kind: 'form',
          form: {
            needs_form: true,
            form_type: typeof obj['form_type'] === 'string' ? obj['form_type'] : undefined,
            message: typeof obj['message'] === 'string' ? obj['message'] : '',
            form_fields: this.isPlainObject(obj['form_fields'])
              ? obj['form_fields'] as Record<string, any>
              : {},
          },
        };
      }

      const message = typeof obj['message'] === 'string' ? obj['message'] : '';
      const tip = typeof obj['tip'] === 'string' ? obj['tip'] : null;
      const outfits = Array.isArray(obj['outfits']) ? obj['outfits'] as OutfitApi[] : [];

      if (message || tip || outfits.length > 0 || 'outfits' in obj || 'message' in obj) {
        return { kind: 'outfits', response: { message, tip, outfits } };
      }

      // Valid JSON object without any user-facing content. Do not render
      // internal metadata as chat text.
      return {
        kind: 'text',
        text: 'I received an unexpected response. Please try again.',
      };
    }

    if (typeof parsed === 'string') {
      return { kind: 'text', text: parsed };
    }

    return {
      kind: 'text',
      text: 'I received an unexpected response. Please try again.',
    };
  }

  parseResponse(raw: string): OutfitPayload {
    const content = this.parseAssistantContent(raw);

    if (content.kind === 'outfits') return content.response;
    if (content.kind === 'form') return content.form;
    return { message: content.text, tip: null, outfits: [] };
  }

  generateId(): string { return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
  resetState() { this.isLoading.set(false); this.error.set(null); }

  private tryParseJson(value: string): unknown | undefined {
    const candidates = [
      value,
      value.replace(/```(?:json)?/gi, '').trim(),
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        return JSON.parse(candidate);
      } catch {
        // Try the next candidate.
      }
    }

    return undefined;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private cleanObject(value: object | undefined): Record<string, unknown> {
    if (!value) return {};
    return Object.fromEntries(
      Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    );
  }
}
