export interface Prompt {
  id: number;
  bucket_id?: string;
  model: string;
  note: string;
  input_tokens: number | null;
  output_tokens: number | null;
  timestamp: Date;
  is_local_only?: boolean;
}

export interface Model {
  name: string;
  inputCost: number; // Cost per 1,000,000 tokens
  outputCost: number; // Cost per 1,000,000 tokens
}
