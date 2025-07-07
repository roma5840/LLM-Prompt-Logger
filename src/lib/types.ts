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
  cachedInputCost: number;
}

export type ConflictType = 'note_length' | 'title_length';

export interface BaseConflict {
  conversationId: number;
  conversationTitle: string;
  type: ConflictType;
}

export interface NoteLengthConflict extends BaseConflict {
  type: 'note_length';
  turnId: number;
  turnContent: string;
  turnTimestamp: Date;
}

export interface TitleLengthConflict extends BaseConflict {
  type: 'title_length';
}

export type ImportConflict = NoteLengthConflict | TitleLengthConflict;


export interface ParsedImportData {
  models: Model[];
  conversations: Conversation[];
}

export type ResolutionChoice = 'edit' | 'keep_local';

export interface Resolution {
  choice: ResolutionChoice;
  content: string;
  conversationId: number;
}