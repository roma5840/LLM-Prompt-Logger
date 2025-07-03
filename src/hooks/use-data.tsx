// src/hooks/use-data.tsx
'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_MODELS, LOCAL_HISTORY_STORAGE, LOCAL_MODELS_STORAGE, SYNC_KEY_STORAGE, SALT_STORAGE, NOTE_CHAR_LIMIT, LOCAL_ONLY_HISTORY_STORAGE, SESSION_MASTER_PASSWORD_STORAGE } from '@/lib/constants'
import { Prompt, Model } from '@/lib/types'
import { useToast } from './use-toast'
import { deriveEncryptionKey, getAccessToken, encrypt, decrypt } from '@/lib/crypto'

interface DataContextType {
  history: Prompt[];
  models: Model[];
  syncKey: string | null;
  loading: boolean;
  syncing: boolean;
  isLocked: boolean;
  noteCharacterLimit: number | null;
  addPrompt: (model: string, note: string, outputTokens: number | null) => Promise<void>;
  updatePrompt: (id: number, note: string, outputTokens: number | null) => Promise<void>;
  deletePrompt: (id: number) => Promise<void>;
  deleteAllPrompts: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserModels: (newModels: Model[]) => Promise<void>;
  checkForMigrationConflicts: () => Prompt[];
  completeMigration: (password: string, notesToMigrate: Prompt[], notesToKeepLocal: Prompt[]) => Promise<void>;
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

// --- HELPER FUNCTIONS ---
const hashAccessToken = async (token: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<Prompt[]>([])
  const [localOnlyHistory, setLocalOnlyHistory] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>(DEFAULT_MODELS)
  const [syncKey, setSyncKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const { toast } = useToast();

  const localOnlyHistoryRef = useRef(localOnlyHistory);
  useEffect(() => {
    localOnlyHistoryRef.current = localOnlyHistory;
  }, [localOnlyHistory]);

  const modelsRef = useRef(models);
  useEffect(() => {
    modelsRef.current = models;
  }, [models]);

  const noteCharacterLimit = useMemo(() => syncKey ? NOTE_CHAR_LIMIT : null, [syncKey]);

  const mergedHistory = useMemo(() => {
    return [...history, ...localOnlyHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [history, localOnlyHistory]);

  const lock = useCallback(() => {
    sessionStorage.removeItem(SESSION_MASTER_PASSWORD_STORAGE);
    setEncryptionKey(null);
    setMasterPassword(null);
    setIsLocked(true);
  }, []);

  const unlinkDevice = useCallback((options?: { showToast?: boolean; title?: string; message?: string }) => {
    const preservedHistory = localOnlyHistoryRef.current.map(p => {
        const { is_local_only, ...rest } = p;
        return rest;
    });
    const preservedModels = modelsRef.current;

    sessionStorage.removeItem(SESSION_MASTER_PASSWORD_STORAGE);
    localStorage.removeItem(SYNC_KEY_STORAGE);
    localStorage.removeItem(SALT_STORAGE);
    localStorage.removeItem(LOCAL_ONLY_HISTORY_STORAGE);
    localStorage.removeItem(LOCAL_HISTORY_STORAGE);
    localStorage.removeItem(LOCAL_MODELS_STORAGE);

    setSyncKey(null);
    setEncryptionKey(null);
    setMasterPassword(null);
    setIsLocked(false);

    setHistory(preservedHistory);
    setLocalOnlyHistory([]);

    setModels(preservedModels);

    if (options?.showToast) {
        toast({
            title: options.title || "Device Unlinked",
            description: options.message || "Cloud sync has been disabled. Your local-only notes have been preserved.",
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
    
    const localOnlyData = localStorage.getItem(LOCAL_ONLY_HISTORY_STORAGE);
    if (localOnlyData) {
        setLocalOnlyHistory(JSON.parse(localOnlyData).map((p: any) => ({...p, timestamp: new Date(p.timestamp)})));
    }

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
        const derivedKey = await deriveEncryptionKey(password, salt);

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

        sessionStorage.setItem(SESSION_MASTER_PASSWORD_STORAGE, password);
        setEncryptionKey(derivedKey);
        setMasterPassword(password);
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
            const sessionPassword = sessionStorage.getItem(SESSION_MASTER_PASSWORD_STORAGE);
            if (sessionPassword) {
                // Session is active, try to unlock automatically
                await unlock(sessionPassword).catch(err => {
                    console.error("Session unlock failed, locking app.", err);
                    lock(); // Lock if session password becomes invalid
                });
            } else {
                // No session, app is locked
                const localOnlyData = localStorage.getItem(LOCAL_ONLY_HISTORY_STORAGE);
                if (localOnlyData) {
                    setLocalOnlyHistory(JSON.parse(localOnlyData).map((p: any) => ({...p, timestamp: new Date(p.timestamp)})));
                }
                setIsLocked(true);
            }
        } else {
            // Load local, unencrypted data
            const localHistory = localStorage.getItem(LOCAL_HISTORY_STORAGE);
            const localModels = localStorage.getItem(LOCAL_MODELS_STORAGE);
            if (localHistory) setHistory(JSON.parse(localHistory).map((e: any) => ({...e, timestamp: new Date(e.timestamp)})));
            if (localModels) setModels(JSON.parse(localModels));
        }
        setLoading(false);
    };
    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!syncKey) {
      localStorage.setItem(LOCAL_HISTORY_STORAGE, JSON.stringify(history));
      localStorage.setItem(LOCAL_MODELS_STORAGE, JSON.stringify(models));
    }
  }, [history, models, syncKey]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem(LOCAL_ONLY_HISTORY_STORAGE, JSON.stringify(localOnlyHistory));
    }
  }, [localOnlyHistory, loading]);

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
    if (!syncKey || !encryptionKey || isLocked) return;

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
  }, [syncKey, encryptionKey, isLocked, refreshDataFromSupabase, unlinkDevice]);

  const addPrompt = async (model: string, note: string, outputTokens: number | null) => {
    if (syncKey) {
      if (!encryptionKey || !masterPassword) throw new Error("App is locked. Cannot add prompt.");
      
      const salt = localStorage.getItem(SALT_STORAGE);
      if (!salt) throw new Error("Salt not found, cannot create access token.");
      const token = await getAccessToken(masterPassword, salt);
      
      const encryptedNote = await encrypt(note, encryptionKey);
      const encryptedTokens = outputTokens !== null ? await encrypt(String(outputTokens), encryptionKey) : null;
      
      const optimisticPrompt: Prompt = { id: Date.now(), bucket_id: syncKey, model, note, output_tokens: outputTokens, timestamp: new Date() }
      setHistory(prev => [optimisticPrompt, ...prev])
      
      const { error } = await supabase.rpc('add_new_prompt', { 
          p_bucket_id: syncKey, 
          p_model: model, 
          p_note: encryptedNote, 
          p_output_tokens: encryptedTokens,
          p_access_token: token
      })
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
    const targetPrompt = mergedHistory.find(p => p.id === promptId);
    if (!targetPrompt) return;

    if (targetPrompt.is_local_only) {
      setLocalOnlyHistory(prev => prev.map(p => p.id === promptId ? { ...p, note: newNote, output_tokens: newOutputTokens } : p));
    } else {
      setHistory(prev => prev.map(p => p.id === promptId ? { ...p, note: newNote, output_tokens: newOutputTokens } : p));
      if (syncKey) {
        if (!encryptionKey || !masterPassword) throw new Error("App is locked. Cannot update prompt.");
        
        const salt = localStorage.getItem(SALT_STORAGE);
        if (!salt) throw new Error("Salt not found, cannot create access token.");
        const token = await getAccessToken(masterPassword, salt);

        const encryptedNote = await encrypt(newNote, encryptionKey);
        const encryptedTokens = newOutputTokens !== null ? await encrypt(String(newOutputTokens), encryptionKey) : null;

        const { error } = await supabase.rpc('update_my_prompt', { 
          p_prompt_id: promptId, 
          p_bucket_id: syncKey, 
          p_new_note: encryptedNote,
          p_new_output_tokens: encryptedTokens,
          p_access_token: token
        })
        if (error) {
          refreshDataFromSupabase(syncKey, encryptionKey) // Revert
        } else {
          await broadcastChange('prompts_changed');
        }
      }
    }
  }

  const deletePrompt = async (promptId: number) => {
    const targetPrompt = mergedHistory.find(p => p.id === promptId);
    if (!targetPrompt) return;

    if (targetPrompt.is_local_only) {
        setLocalOnlyHistory(prev => prev.filter(p => p.id !== promptId));
    } else {
        const originalHistory = history
        setHistory(prev => prev.filter(p => p.id !== promptId))
        if (syncKey) {
          if (!encryptionKey || !masterPassword) throw new Error("App is locked. Cannot delete prompt.");
          
          const salt = localStorage.getItem(SALT_STORAGE);
          if (!salt) throw new Error("Salt not found, cannot create access token.");
          const token = await getAccessToken(masterPassword, salt);

          const { error } = await supabase.rpc('delete_my_prompt', { 
              p_prompt_id: promptId, 
              p_bucket_id: syncKey,
              p_access_token: token
          })
          if (error) {
            setHistory(originalHistory)
          } else {
            await broadcastChange('prompts_changed');
          }
        }
    }
  }

  const deleteAllPrompts = async () => {
    if (syncKey) {
      if (!encryptionKey || !masterPassword) throw new Error("App is locked. Cannot delete prompts.");

      const salt = localStorage.getItem(SALT_STORAGE);
      if (!salt) throw new Error("Salt not found, cannot create access token.");
      const token = await getAccessToken(masterPassword, salt);
      
      const originalHistory = history;
      setHistory([]);
      const { error } = await supabase.rpc('delete_all_my_prompts', { 
          p_bucket_id: syncKey,
          p_access_token: token
      })
      if (error) {
        setHistory(originalHistory);
        throw error;
      } else {
        await broadcastChange('prompts_changed');
      }
    } else {
        setHistory([]);
    }
  }

  const updateUserModels = async (newModels: Model[]) => {
    const originalModels = models
    setModels(newModels)
    if (syncKey) {
      if (!encryptionKey || !masterPassword) throw new Error("App is locked. Cannot update models.");
      
      const salt = localStorage.getItem(SALT_STORAGE);
      if (!salt) throw new Error("Salt not found, cannot create access token.");
      const token = await getAccessToken(masterPassword, salt);

      const { error } = await supabase.rpc('update_my_models', { 
          p_bucket_id: syncKey, 
          p_new_models: newModels,
          p_access_token: token
      })
      if (error) {
        setModels(originalModels)
      } else {
        await broadcastChange('models_changed');
      }
    }
  }

  const checkForMigrationConflicts = (): Prompt[] => {
    const localHistoryRaw = localStorage.getItem(LOCAL_HISTORY_STORAGE);
    if (!localHistoryRaw) return [];
    const localHistory: Prompt[] = JSON.parse(localHistoryRaw);
    return localHistory.filter(p => p.note && p.note.length > NOTE_CHAR_LIMIT);
  };

  const completeMigration = async (password: string, notesToMigrate: Prompt[], notesToKeepLocal: Prompt[]) => {
    setSyncing(true)
    try {
      const salt = window.btoa(String.fromCharCode.apply(null, Array.from(window.crypto.getRandomValues(new Uint8Array(16)))));
      const derivedKey = await deriveEncryptionKey(password, salt);
      const verificationHash = await encrypt(VERIFICATION_STRING, derivedKey);
      
      const newAccessToken = await getAccessToken(password, salt);
      const accessTokenHash = await hashAccessToken(newAccessToken);

      const localModels = JSON.parse(localStorage.getItem(LOCAL_MODELS_STORAGE) || JSON.stringify(DEFAULT_MODELS));

      const { data: newKey, error: createError } = await supabase.rpc('create_new_bucket', { 
        p_models: localModels, 
        p_salt: salt, 
        p_verification_hash: verificationHash,
        p_access_token_hash: accessTokenHash
      });
      if (createError || !newKey) {
        throw new Error('Could not enable sync. Please try again.');
      }

      if (notesToMigrate.length > 0) {
        const encryptedHistoryBatch = await Promise.all(notesToMigrate.map(async (entry: any) => {
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
            p_prompts_jsonb: encryptedHistoryBatch,
            p_access_token: newAccessToken
        });
        if (batchError) throw batchError;
      }
      
      const finalLocalNotes = notesToKeepLocal.map(p => ({ ...p, is_local_only: true }));
      setLocalOnlyHistory(finalLocalNotes);

      localStorage.setItem(SYNC_KEY_STORAGE, newKey);
      localStorage.setItem(SALT_STORAGE, salt);
      localStorage.setItem(LOCAL_ONLY_HISTORY_STORAGE, JSON.stringify(finalLocalNotes));
      sessionStorage.setItem(SESSION_MASTER_PASSWORD_STORAGE, password);
      localStorage.removeItem(LOCAL_HISTORY_STORAGE);
      localStorage.removeItem(LOCAL_MODELS_STORAGE);
      
      setSyncKey(newKey);
      setEncryptionKey(derivedKey);
      setMasterPassword(password);
      setIsLocked(false);
      setHistory([]); // Will be populated by refreshData
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
        
        const derivedKey = await deriveEncryptionKey(password, salt);
        try {
            const decrypted = await decrypt(verificationHash, derivedKey);
            if (decrypted !== VERIFICATION_STRING) throw new Error("Decryption test failed.");
        } catch (e) {
            throw new Error("Invalid master password.");
        }

        localStorage.setItem(SYNC_KEY_STORAGE, key)
        localStorage.setItem(SALT_STORAGE, salt);
        sessionStorage.setItem(SESSION_MASTER_PASSWORD_STORAGE, password);
        localStorage.removeItem(LOCAL_HISTORY_STORAGE)
        localStorage.removeItem(LOCAL_MODELS_STORAGE)
        
        setSyncKey(key);
        setEncryptionKey(derivedKey);
        setMasterPassword(password);
        setIsLocked(false);
        await refreshDataFromSupabase(key, derivedKey);

    } finally {
        setSyncing(false)
    }
  }

  const deleteAccount = async () => {
    if (!syncKey || !masterPassword) return;
    setSyncing(true)
    try {
      await broadcastChange('account_deleted');

      const salt = localStorage.getItem(SALT_STORAGE);
      if (!salt) throw new Error("Salt not found, cannot create access token.");
      const token = await getAccessToken(masterPassword, salt);
      
      const { error } = await supabase.rpc('delete_my_account', { 
          p_bucket_id: syncKey,
          p_access_token: token
      })
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
        history: mergedHistory.map(p => ({ model: p.model, note: p.note, output_tokens: p.output_tokens, timestamp: new Date(p.timestamp).toISOString() }))
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
            if (!encryptionKey || !masterPassword) throw new Error("App is locked. Cannot import.");
            
            const salt = localStorage.getItem(SALT_STORAGE);
            if (!salt) throw new Error("Salt not found, cannot create access token.");
            const token = await getAccessToken(masterPassword, salt);

            const oversizedNote = importedData.history.find(
              (p: any) => p.note && typeof p.note === 'string' && p.note.length > NOTE_CHAR_LIMIT
            );

            if (oversizedNote) {
              throw new Error(`Import failed. A note in the file exceeds the ${NOTE_CHAR_LIMIT} character limit for synced accounts.`);
            }
            
            await supabase.rpc('delete_all_my_prompts', { p_bucket_id: syncKey, p_access_token: token })
            await supabase.rpc('update_my_models', { p_bucket_id: syncKey, p_new_models: importedData.models, p_access_token: token })
            
            if (importedData.history.length > 0) {
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

                const { error: batchError } = await supabase.rpc('batch_add_prompts', {
                    p_bucket_id: syncKey,
                    p_prompts_jsonb: encryptedHistoryBatch,
                    p_access_token: token
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
    history: mergedHistory,
    models,
    syncKey,
    loading,
    syncing,
    isLocked,
    noteCharacterLimit,
    addPrompt,
    updatePrompt,
    deletePrompt,
    deleteAllPrompts,
    deleteAccount,
    updateUserModels,
    checkForMigrationConflicts,
    completeMigration,
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