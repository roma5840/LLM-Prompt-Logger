import { Model } from './types';

export const SYNC_KEY_STORAGE = 'llmPromptSyncKey';
export const LOCAL_HISTORY_STORAGE = 'llmLocalHistory';
export const LOCAL_MODELS_STORAGE = 'llmLocalModels';
export const LOCAL_ONLY_HISTORY_STORAGE = 'llmLocalOnlyHistory';

export const DEFAULT_MODELS: Model[] = [
    { name: "Gemini 2.5 Pro", inputCost: 0, outputCost: 0 },
    { name: "Gemini 2.5 Flash", inputCost: 0, outputCost: 0 },
    { name: "ChatGPT 4o", inputCost: 0, outputCost: 0 }
];

export const NOTE_CHAR_LIMIT = 1500;
export const CONVERSATION_TITLE_LIMIT = 150;
export const MANUAL_TOKEN_LIMIT = 1_000_000_000;

export const SALT_STORAGE = 'llmPromptSalt';
export const SESSION_MASTER_PASSWORD_STORAGE = 'llmSessionMasterPassword';