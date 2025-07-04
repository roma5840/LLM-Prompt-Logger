export interface Turn {
  id: number;
  conversation_id: number;
  model: string;
  role: 'user' | 'assistant'; // We'll primarily use 'assistant' for logged turns
  content: string; // This is the user's "note" or summary
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