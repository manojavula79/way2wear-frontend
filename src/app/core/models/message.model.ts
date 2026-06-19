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
