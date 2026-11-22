// ============================================
// MESSAGE MODEL
// ============================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: boolean;
  image?: string
}

export interface OutfitResponse {
  message: string;
  tip?: string | null;
  outfits: Outfit[];
}

/**
 * Dynamic form returned by the backend when it needs more details before
 * generating recommendations (e.g. styling another person).
 */
export interface DynamicFormField {
  type?: string;
  options?: string[];
  required?: boolean;
}

export interface DynamicFormResponse {
  needs_form: true;
  form_type?: string;
  message: string;
  form_fields: Record<string, DynamicFormField>;
}

export interface SubmittedFormValues {
  gender?: string | null;
  skin_tone?: string | null;
  size?: string | null;
  [key: string]: string | null | undefined;
}

export interface ProfileFormSubmission {
  sessionId: string;
  messageId: string;
  formType?: string;
  formData?: SubmittedFormValues;
  action?: 'skip';
}

export interface OutfitItem {
  title: string;
  brand?: string;
  price?: number;
  currency?: string;
  color?: string;
  image?: string;
  url?: string;
}
export interface Outfit {
  id: string;
  name: string;
  note?: string;
  shoe_note?: string;
  top: OutfitItem;
  bottom: OutfitItem;
}

export interface ProductItem {
  title: string;
  brand: string;
  price: number;
  color: string;
  url: string;
  image?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
  history: Array<{ role: MessageRole; content: string }>;
}

export interface ChatApiResponse {
  response: string;
  sessionId: string;
  messageId?: string;
  session_id?: string;
  message_id?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}
