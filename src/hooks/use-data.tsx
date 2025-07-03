// src/hooks/use-data.tsx
'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_MODELS, LOCAL_HISTORY_STORAGE, LOCAL_MODELS_STORAGE, SYNC_KEY_STORAGE, ENCRYPTION_KEY_STORAGE, SALT_STORAGE } from '@/lib/constants'
import { Prompt, Model } from '@/lib/types'
import { useToast } from './use-toast'
import { deriveKey, encrypt, decrypt } from '@/lib/crypto'

interface DataContextType {
  history: Prompt[];
  models: Model[];
  syncKey: string | null;
  loading: boolean;
  syncing: boolean;
  isLocked: boolean;
  addPrompt: (model: string, note: string, outputTokens: number | null) => Promise<void>;
  updatePrompt: (id: number, note: string, outputTokens: number | null) => Promise<void>;
  deletePrompt: (id: number) => Promise<void>;
  deleteAllPrompts: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserModels: (newModels: Model[]) => Promise<void>;
  migrateToCloud: (password: string) => Promise<void>;
  linkDeviceWithKey: (key: string, password: string) => Promise<void>;
  unlinkDevice: () => void;
  lock: () => void;
  unlock: (password: string) => Promise<void>;
  handleExportData: () => Promise<void>;
  handleImportData: (file: File) => Promise<void>;
  setHistory: React.Dispatch<React.SetStateAction<Prompt[]>>;
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

const VERIFICATION_STRING = 'PROMPT_LOG_OK';

// --- HELPER FUNCTIONS FOR KEY STORAGE ---
const saveKeyToLocalStorage = async (key: CryptoKey) => {
    try {
        const jwk = await window.crypto.subtle.exportKey('jwk', key);
        localStorage.setItem(ENCRYPTION_KEY_STORAGE, JSON.stringify(jwk));
    } catch (e) {
        console.error("Failed to save key", e);
    }
};

const loadKeyFromLocalStorage = async (): Promise<CryptoKey | null> => {
    const jwkString = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
    if (!jwkString) return null;
    try {
        const jwk = JSON.parse(jwkString);
        return await window.crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'AES-GCM' },
            true,
            ['encrypt', 'decrypt']
        );
    } catch (e) {
        console.error("Failed to load key, clearing invalid key.", e);
        localStorage.removeItem(ENCRYPTION_KEY_STORAGE);
        return null;
    }
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<Prompt[]>([])
  const [models, setModels] = useState<Model[]>(DEFAULT_MODELS)
  const [syncKey, setSyncKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const { toast } = useToast();

  const lock = useCallback(() => {
    localStorage.removeItem(ENCRYPTION_KEY_STORAGE);
    setEncryptionKey(null);
    setIsLocked(true);
    setHistory([]);
    setModels(DEFAULT_MODELS);
  }, []);

  const unlinkDevice = useCallback((options?: { showToast?: boolean; title?: string; message?: string }) => {
    localStorage.removeItem(SYNC_KEY_STORAGE);
    localStorage.removeItem(SALT_STORAGE);
    localStorage.removeItem(ENCRYPTION_KEY_STORAGE);
    localStorage.removeItem(LOCAL_HISTORY_STORAGE);
    localStorage.removeItem(LOCAL_MODELS_STORAGE);
    
    setSyncKey(null);
    setEncryptionKey(null);
    setIsLocked(false);
    setHistory([]);
    setModels(DEFAULT_MODELS);

    if (options?.showToast) {
        toast({
            title: options.title || "Device Unlinked",
            description: options.message || "Cloud sync has been disabled on this device.",
            variant: "destructive",
            duration: 10000,
        });
    }
  }, [toast]);
  
  const decryptHistory = useCallback(async (key: CryptoKey, encryptedHistory: any[]): Promise<Prompt[]> => {
    const decrypted = await Promise.all(
      encryptedHistory.map(async (p: any) => {
        try {
          const decryptedNote = p.note ? await decrypt(p.note, key) : '';
          const decryptedTokensStr = p.output_tokens ? await decrypt(p.output_tokens, key) : null;
          const output_tokens = decryptedTokensStr ? parseInt(decryptedTokensStr, 10) : null;

          return { ...p, note: decryptedNote, output_tokens, timestamp: new Date(p.timestamp) };
        } catch (e) {
          console.error(`Failed to decrypt prompt id ${p.id}. It may be corrupted.`, e);
          return { ...p, note: '[DECRYPTION FAILED]', output_tokens: null, timestamp: new Date(p.timestamp) };
        }
      })
    );
    return decrypted;
  }, []);

  const refreshDataFromSupabase = useCallback(async (key: string, encKey: CryptoKey) => {
    const { data: bucketData, error: bucketError } = await supabase.rpc('get_my_bucket_data', { p_bucket_id: key });

    if (bucketError) {
      console.error('Error refreshing data from cloud:', bucketError);
      return;
    }

    if (!bucketData || bucketData.length === 0) {
      console.warn('Sync key/account not found in the cloud. Unlinking device.');
      unlinkDevice({ 
        showToast: true, 
        title: "Account Not Found",
        message: "Your cloud account has been unlinked because it could not be found." 
      });
      return;
    }
    
    setModels(bucketData[0].models || [...DEFAULT_MODELS]);

    const { data: promptsData, error: promptsError } = await supabase.rpc('get_my_prompts', { p_bucket_id: key });
    if (promptsError) {
      console.error('Error refreshing prompts:', promptsError);
    } else {
      const decryptedHistory = await decryptHistory(encKey, promptsData);
      setHistory(decryptedHistory);
    }
  }, [unlinkDevice, decryptHistory]);

  const loadDataFromSupabase = useCallback(async (key: string, encKey: CryptoKey) => {
    setLoading(true);
    await refreshDataFromSupabase(key, encKey);
    setLoading(false);
  }, [refreshDataFromSupabase]);

  const unlock = useCallback(async (password: string) => {
    setSyncing(true);
    try {
        const key = localStorage.getItem(SYNC_KEY_STORAGE);
        const salt = localStorage.getItem(SALT_STORAGE);
        if (!key || !salt) {
            throw new Error("Cannot unlock, sync key or salt not found on device.");
        }
        const derivedKey = await deriveKey(password, salt);

        const { data: bucketData, error: bucketError } = await supabase.rpc('get_my_bucket_data', { p_bucket_id: key });
        if (bucketError || !bucketData || bucketData.length === 0) throw new Error("Could not find account data to verify password.");
        const verificationHash = bucketData[0].verification_hash;
        if (!verificationHash) throw new Error("Account is corrupted. Cannot verify password.");

        try {
            const decrypted = await decrypt(verificationHash, derivedKey);
            if (decrypted !== VERIFICATION_STRING) throw new Error("Decryption test failed.");
        } catch (e) {
            throw new Error("Invalid master password.");
        }

        await saveKeyToLocalStorage(derivedKey);
        setEncryptionKey(derivedKey);
        setIsLocked(false);
        await loadDataFromSupabase(key, derivedKey);
    } catch (err) {
        throw err;
    } finally {
        setSyncing(false);
    }
  }, [loadDataFromSupabase]);

  useEffect(() => {
    const initialize = async () => {
        const key = localStorage.getItem(SYNC_KEY_STORAGE);
        if (key) {
            setSyncKey(key);
            const loadedKey = await loadKeyFromLocalStorage();
            if (loadedKey) {
                // Key found, app is unlocked
                setEncryptionKey(loadedKey);
                setIsLocked(false);
                await loadDataFromSupabase(key, loadedKey);
            } else {
                // No key found, app is locked
                setIsLocked(true);
                setLoading(false);
            }
        } else {
            // Load local, unencrypted data
            const localHistory = localStorage.getItem(LOCAL_HISTORY_STORAGE);
            const localModels = localStorage.getItem(LOCAL_MODELS_STORAGE);
            if (localHistory) setHistory(JSON.parse(localHistory).map((e: any) => ({...e, timestamp: new Date(e.timestamp)})));
            if (localModels) setModels(JSON.parse(localModels));
            setLoading(false);
        }
    };
    initialize();
  }, [loadDataFromSupabase]);

  useEffect(() => {
    if (!syncKey) {
      localStorage.setItem(LOCAL_HISTORY_STORAGE, JSON.stringify(history));
      localStorage.setItem(LOCAL_MODELS_STORAGE, JSON.stringify(models));
    }
  }, [history, models, syncKey]);

  const broadcastChange = async (event: string) => {
    if (!syncKey) return;
    try {
      const channel = supabase.channel(`data-sync-${syncKey}`);
      await channel.send({ type: 'broadcast', event });
    } catch (error) {
      console.error(`Failed to broadcast event '${event}':`, error);
    }
  };

  useEffect(() => {
    if (!syncKey || !encryptionKey) return;

    const channel = supabase.channel(`data-sync-${syncKey}`);
    channel
      .on('broadcast', { event: 'prompts_changed' }, () => refreshDataFromSupabase(syncKey, encryptionKey))
      .on('broadcast', { event: 'models_changed' }, () => refreshDataFromSupabase(syncKey, encryptionKey))
      .on('broadcast', { event: 'account_deleted' }, () => {
        unlinkDevice({
          showToast: true,
          title: "Account Deleted",
          message: "This cloud account was deleted from another device. This device has been unlinked.",
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncKey, encryptionKey, refreshDataFromSupabase, unlinkDevice]);

  const addPrompt = async (model: string, note: string, outputTokens: number | null) => {
    if (syncKey) {
      if (!encryptionKey) throw new Error("App is locked. Cannot add prompt.");
      const encryptedNote = await encrypt(note, encryptionKey);
      const encryptedTokens = outputTokens !== null ? await encrypt(String(outputTokens), encryptionKey) : null;
      
      const optimisticPrompt: Prompt = { id: Date.now(), bucket_id: syncKey, model, note, output_tokens: outputTokens, timestamp: new Date() }
      setHistory(prev => [optimisticPrompt, ...prev])
      
      const { error } = await supabase.rpc('add_new_prompt', { p_bucket_id: syncKey, p_model: model, p_note: encryptedNote, p_output_tokens: encryptedTokens })
      if (error) {
        setHistory(prev => prev.filter(p => p.id !== optimisticPrompt.id))
        throw new Error("Failed to log prompt. The server might be unreachable.");
      } else {
        await refreshDataFromSupabase(syncKey, encryptionKey);
        await broadcastChange('prompts_changed');
      }
    } else {
      const newPrompt: Prompt = { id: Date.now() + Math.random(), model, note, output_tokens: outputTokens, timestamp: new Date() }
      setHistory(prev => [newPrompt, ...prev])
    }
  }

  const updatePrompt = async (promptId: number, newNote: string, newOutputTokens: number | null) => {
    setHistory(prev => prev.map(p => p.id === promptId ? { ...p, note: newNote, output_tokens: newOutputTokens } : p))
    if (syncKey) {
      if (!encryptionKey) throw new Error("App is locked. Cannot update prompt.");
      const encryptedNote = await encrypt(newNote, encryptionKey);
      const encryptedTokens = newOutputTokens !== null ? await encrypt(String(newOutputTokens), encryptionKey) : null;

      const { error } = await supabase.rpc('update_my_prompt', { 
        p_prompt_id: promptId, 
        p_bucket_id: syncKey, 
        p_new_note: encryptedNote,
        p_new_output_tokens: encryptedTokens
      })
      if (error) {
        refreshDataFromSupabase(syncKey, encryptionKey) // Revert
      } else {
        await broadcastChange('prompts_changed');
      }
    }
  }

  const deletePrompt = async (promptId: number) => {
    const originalHistory = history
    setHistory(prev => prev.filter(p => p.id !== promptId))
    if (syncKey) {
      if (!encryptionKey) throw new Error("App is locked. Cannot delete prompt.");
      const { error } = await supabase.rpc('delete_my_prompt', { p_prompt_id: promptId, p_bucket_id: syncKey })
      if (error) {
        setHistory(originalHistory)
      } else {
        await broadcastChange('prompts_changed');
      }
    }
  }

  const deleteAllPrompts = async () => {
    const originalHistory = history
    setHistory([])
    if (syncKey) {
      if (!encryptionKey) throw new Error("App is locked. Cannot delete prompts.");
      const { error } = await supabase.rpc('delete_all_my_prompts', { p_bucket_id: syncKey })
      if (error) {
        setHistory(originalHistory)
      } else {
        await broadcastChange('prompts_changed');
      }
    }
  }

  const updateUserModels = async (newModels: Model[]) => {
    const originalModels = models
    setModels(newModels)
    if (syncKey) {
      if (!encryptionKey) throw new Error("App is locked. Cannot update models.");
      const { error } = await supabase.rpc('update_my_models', { p_bucket_id: syncKey, p_new_models: newModels })
      if (error) {
        setModels(originalModels)
      } else {
        await broadcastChange('models_changed');
      }
    }
  }

  const migrateToCloud = async (password: string) => {
    setSyncing(true)
    try {
      const salt = window.btoa(String.fromCharCode.apply(null, Array.from(window.crypto.getRandomValues(new Uint8Array(16)))));
      const derivedKey = await deriveKey(password, salt);
      const verificationHash = await encrypt(VERIFICATION_STRING, derivedKey);

      const localModels = JSON.parse(localStorage.getItem(LOCAL_MODELS_STORAGE) || JSON.stringify(DEFAULT_MODELS))
      const localHistory = JSON.parse(localStorage.getItem(LOCAL_HISTORY_STORAGE) || '[]')

      const { data: newKey, error: createError } = await supabase.rpc('create_new_bucket', { 
        p_models: localModels, 
        p_salt: salt, 
        p_verification_hash: verificationHash 
      })
      if (createError || !newKey) {
        throw new Error('Could not enable sync. Please try again.')
      }

      if (localHistory.length > 0) {
        const encryptedHistoryBatch = await Promise.all(localHistory.map(async (entry: any) => {
            const encryptedNote = await encrypt(entry.note || '', derivedKey);
            const encryptedTokens = entry.output_tokens !== null ? await encrypt(String(entry.output_tokens), derivedKey) : null;
            return {
                model: entry.model,
                note: encryptedNote,
                output_tokens: encryptedTokens,
                timestamp: new Date(entry.timestamp).toISOString()
            };
        }));
        
        const { error: batchError } = await supabase.rpc('batch_add_prompts', {
            p_bucket_id: newKey,
            p_prompts_jsonb: encryptedHistoryBatch
        });
        if (batchError) throw batchError;
      }
      
      await saveKeyToLocalStorage(derivedKey);
      localStorage.setItem(SYNC_KEY_STORAGE, newKey);
      localStorage.setItem(SALT_STORAGE, salt);
      localStorage.removeItem(LOCAL_HISTORY_STORAGE);
      localStorage.removeItem(LOCAL_MODELS_STORAGE);
      
      setSyncKey(newKey);
      setEncryptionKey(derivedKey);
      setIsLocked(false);
      await refreshDataFromSupabase(newKey, derivedKey);

    } finally {
      setSyncing(false)
    }
  }

  const linkDeviceWithKey = async (key: string, password: string) => {
    if (!key || key.length < 36) {
        throw new Error('Invalid Sync Key format.')
    }
    setSyncing(true)
    try {
        const { data, error } = await supabase.rpc('get_my_bucket_data', { p_bucket_id: key })
        if (error || !data || data.length === 0) throw new Error('Sync Key not found.')

        const bucket = data[0];
        const salt = bucket.salt;
        const verificationHash = bucket.verification_hash;
        if (!salt || !verificationHash) throw new Error('Account is not E2EE enabled or is corrupted.');
        
        const derivedKey = await deriveKey(password, salt);
        try {
            const decrypted = await decrypt(verificationHash, derivedKey);
            if (decrypted !== VERIFICATION_STRING) throw new Error("Decryption test failed.");
        } catch (e) {
            throw new Error("Invalid master password.");
        }

        await saveKeyToLocalStorage(derivedKey);
        localStorage.setItem(SYNC_KEY_STORAGE, key)
        localStorage.setItem(SALT_STORAGE, salt);
        localStorage.removeItem(LOCAL_HISTORY_STORAGE)
        localStorage.removeItem(LOCAL_MODELS_STORAGE)
        
        setSyncKey(key);
        setEncryptionKey(derivedKey);
        setIsLocked(false);
        await refreshDataFromSupabase(key, derivedKey);

    } finally {
        setSyncing(false)
    }
  }

  const deleteAccount = async () => {
    if (!syncKey) return;
    setSyncing(true)
    try {
      await broadcastChange('account_deleted');
      const { error } = await supabase.rpc('delete_my_account', { p_bucket_id: syncKey })
      if (error) {
        throw new Error('Could not delete account. Please try again.');
      }
      unlinkDevice();
    } finally {
      setSyncing(false)
    }
  }
  
  const handleExportData = async () => {
    if (isLocked) {
      toast({ title: "Unlock required", description: "Please unlock the app to export data.", variant: "destructive" });
      return;
    }
    const dataToExport = {
        models: models,
        history: history.map(p => ({ model: p.model, note: p.note, output_tokens: p.output_tokens, timestamp: new Date(p.timestamp).toISOString() }))
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `llm-prompt-tracker-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

  const handleImportData = async (file: File) => {
    if (isLocked && !syncKey) {
        toast({ title: "Unlock required", description: "Please unlock the app to import data.", variant: "destructive" });
        return;
    }
    setSyncing(true)
    try {
        const text = await file.text()
        const importedData = JSON.parse(text)
        if (!importedData || !Array.isArray(importedData.models) || !Array.isArray(importedData.history)) {
            throw new Error('Invalid file format.');
        }
        
        if (syncKey) {
            if (!encryptionKey) throw new Error("App is locked. Cannot import.");
            
            // Clear existing data and update models
            await supabase.rpc('delete_all_my_prompts', { p_bucket_id: syncKey })
            await supabase.rpc('update_my_models', { p_bucket_id: syncKey, p_new_models: importedData.models })
            
            if (importedData.history.length > 0) {
                // Encrypt all prompts on the client before sending
                const encryptedHistoryBatch = await Promise.all(importedData.history.map(async (entry: any) => {
                    const encryptedNote = await encrypt(entry.note || '', encryptionKey);
                    const encryptedTokens = entry.output_tokens !== null ? await encrypt(String(entry.output_tokens), encryptionKey) : null;
                    return {
                        model: entry.model,
                        note: encryptedNote,
                        output_tokens: encryptedTokens,
                        timestamp: new Date(entry.timestamp).toISOString()
                    };
                }));

                // Call the new batch function
                const { error: batchError } = await supabase.rpc('batch_add_prompts', {
                    p_bucket_id: syncKey,
                    p_prompts_jsonb: encryptedHistoryBatch
                });
                if (batchError) throw batchError;
            }
            
            await broadcastChange('prompts_changed');
            await broadcastChange('models_changed');
            
            await refreshDataFromSupabase(syncKey, encryptionKey)

        } else {
            setModels(importedData.models)
            setHistory(importedData.history.map((entry: any) => ({
                ...entry,
                id: Date.now() + Math.random(),
                timestamp: new Date(entry.timestamp)
            })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
        }
    } catch (error: any) {
        console.error("Import error:", error);
        throw new Error(error.message || 'An unknown error occurred during import.');
    } finally {
        setSyncing(false)
    }
  }

  const value = {
    history,
    models,
    syncKey,
    loading,
    syncing,
    isLocked,
    addPrompt,
    updatePrompt,
    deletePrompt,
    deleteAllPrompts,
    deleteAccount,
    updateUserModels,
    migrateToCloud,
    linkDeviceWithKey,
    unlinkDevice,
    lock,
    unlock,
    handleExportData,
    handleImportData,
    setHistory,
    setModels,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};