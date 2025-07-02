export interface Prompt {
  id: number;
  bucket_id?: string;
  model: string;
  note: string;
  output_tokens: number | null;
  timestamp: Date;
}

export type Model = string;