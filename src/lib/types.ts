export interface Turn {
  id: number;
  conversation_id: number;
  model: string;
  role: 'user' | 'assistant';
  content: string;
  input_tokens: number | null;
  output_tokens: number | null;
  timestamp: Date;
}

export interface Conversation {
  id: number;
  bucket_id?: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  messages: Turn[];
  is_local_only?: boolean;
}

export interface Model {
  name: string;
  inputCost: number;
  outputCost: number;
  isCacheEnabled: boolean;
  cacheDiscount: number;
}

export interface ImportConflict {
  conversationId: number;
  conversationTitle: string;
  turnId: number;
  turnContent: string;
  turnTimestamp: Date;
}

export interface ParsedImportData {
  models: Model[];
  conversations: Conversation[];
}
