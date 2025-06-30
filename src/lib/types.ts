export interface Prompt {
  id: number;
  bucket_id?: string;
  model: string;
  note: string;
  timestamp: Date;
}

export type Model = string;
