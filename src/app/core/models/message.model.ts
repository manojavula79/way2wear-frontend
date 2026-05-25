// ============================================
// MESSAGE MODEL
// ============================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  error?: boolean;
}

export interface OutfitResponse {
  message: string;
  tip?: string;
  outfits: OutfitItem[];
}

export interface OutfitItem {
  id: string;
  name: string;
  top: ProductItem;
  bottom: ProductItem;
  accessory?: ProductItem;
  note: string;
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
