export interface Prompt {
  id: number;
  bucket_id?: string;
  model: string;
  note: string;
  output_tokens: number | null;
  timestamp: Date;
  is_local_only?: boolean;
}

export type Model = string;