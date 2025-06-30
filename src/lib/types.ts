export interface PromptLog {
  id: string;
  prompt: string;
  model: 'GPT-4' | 'Claude 3' | 'Gemini 1.5' | 'Other';
  notes: string;
  timestamp: Date;
}
