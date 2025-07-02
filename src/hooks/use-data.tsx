// src/hooks/use-data.tsx
'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_MODELS, LOCAL_HISTORY_STORAGE, LOCAL_MODELS_STORAGE, SYNC_KEY_STORAGE } from '@/lib/constants'
import { Prompt, Model } from '@/lib/types'
import { useToast } from './use-toast'

interface DataContextType {
  history: Prompt[];
  models: Model[];
  syncKey: string | null;
  loading: boolean;
  syncing: boolean;
  addPrompt: (model: string, note: string, outputTokens: number | null) => Promise<void>;
  updatePrompt: (id: number, note: string, outputTokens: number | null) => Promise<void>;
  deletePrompt: (id: number) => Promise<void>;
  deleteAllPrompts: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserModels: (newModels: Model[]) => Promise<void>;
  migrateToCloud: () => Promise<void>;
  linkDeviceWithKey: (key: string) => Promise<void>;
  unlinkDevice: () => void;
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

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<Prompt[]>([])
  const [models, setModels] = useState<Model[]>(DEFAULT_MODELS)
  const [syncKey, setSyncKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const { toast } = useToast();

  const unlinkDevice = useCallback((options?: { showToast?: boolean; title?: string; message?: string }) => {
    localStorage.removeItem(SYNC_KEY_STORAGE);
    localStorage.removeItem(LOCAL_HISTORY_STORAGE);
    localStorage.removeItem(LOCAL_MODELS_STORAGE);
    
    setSyncKey(null);
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

  const loadDataFromLocalStorage = useCallback(() => {
    const localHistory = localStorage.getItem(LOCAL_HISTORY_STORAGE)
    const localModels = localStorage.getItem(LOCAL_MODELS_STORAGE)
    
    if (localHistory) {
      setHistory(JSON.parse(localHistory).map((entry: any) => ({ ...entry, timestamp: new Date(entry.timestamp) })))
    }
    if (localModels) {
      setModels(JSON.parse(localModels))
    } else {
      localStorage.setItem(LOCAL_MODELS_STORAGE, JSON.stringify(DEFAULT_MODELS))
    }
    setLoading(false)
  }, [])

  const saveDataToLocalStorage = useCallback(() => {
    if (syncKey) return
    localStorage.setItem(LOCAL_HISTORY_STORAGE, JSON.stringify(history))
    localStorage.setItem(LOCAL_MODELS_STORAGE, JSON.stringify(models))
  }, [history, models, syncKey])

  const refreshDataFromSupabase = useCallback(async (key: string) => {
    const { data: bucketData, error: bucketError } = await supabase.rpc('get_my_bucket_data', { p_bucket_id: key });

    if (bucketError) {
      console.error('Error refreshing data from cloud:', bucketError);
      return;
    }

    if (!bucketData || bucketData.length === 0) {
      console.warn('Sync key/account not found in the cloud. The account may have been deleted. Unlinking device.');
      unlinkDevice({ 
        showToast: true, 
        title: "Account Not Found",
        message: "Your cloud account has been unlinked because it could not be found. It may have been deleted from another device." 
      });
      return;
    }
    
    setModels(bucketData[0].models || [...DEFAULT_MODELS]);

    const { data: promptsData, error: promptsError } = await supabase.rpc('get_my_prompts', { p_bucket_id: key });
    if (promptsError) {
      console.error('Error refreshing prompts:', promptsError);
    } else {
      setHistory(promptsData.map((p: any) => ({ ...p, timestamp: new Date(p.timestamp) })));
    }
  }, [unlinkDevice]);

  const loadDataFromSupabase = useCallback(async (key: string) => {
    setLoading(true)
    await refreshDataFromSupabase(key);
    setLoading(false)
  }, [refreshDataFromSupabase])

  useEffect(() => {
    const key = localStorage.getItem(SYNC_KEY_STORAGE)
    if (key) {
      setSyncKey(key)
      loadDataFromSupabase(key)
    } else {
      loadDataFromLocalStorage()
    }
  }, [loadDataFromSupabase, loadDataFromLocalStorage])

  useEffect(() => {
    if (!syncKey) {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === LOCAL_HISTORY_STORAGE) {
          const newHistory = e.newValue ? JSON.parse(e.newValue) : []
          setHistory(newHistory.map((entry: any) => ({ ...entry, timestamp: new Date(entry.timestamp) })))
        }
        if (e.key === LOCAL_MODELS_STORAGE) {
          const newModels = e.newValue ? JSON.parse(e.newValue) : [...DEFAULT_MODELS]
          setModels(newModels)
        }
      }
      window.addEventListener('storage', handleStorageChange)
      return () => window.removeEventListener('storage', handleStorageChange)
    }
  }, [syncKey])
  
  useEffect(() => {
    if (!syncKey) {
      saveDataToLocalStorage()
    }
  }, [history, models, syncKey, saveDataToLocalStorage])

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
    if (!syncKey) return;

    const channel = supabase.channel(`data-sync-${syncKey}`);

    channel
      .on('broadcast', { event: 'prompts_changed' }, () => refreshDataFromSupabase(syncKey))
      .on('broadcast', { event: 'models_changed' }, () => refreshDataFromSupabase(syncKey))
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
  }, [syncKey, refreshDataFromSupabase, unlinkDevice]);

  const addPrompt = async (model: string, note: string, outputTokens: number | null) => {
    if (syncKey) {
      const optimisticPrompt: Prompt = { id: Date.now(), bucket_id: syncKey, model, note, output_tokens: outputTokens, timestamp: new Date() }
      setHistory(prev => [optimisticPrompt, ...prev])
      const { error } = await supabase.rpc('add_new_prompt', { p_bucket_id: syncKey, p_model: model, p_note: note, p_output_tokens: outputTokens })
      if (error) {
        console.error('Error adding prompt:', error)
        setHistory(prev => prev.filter(p => p.id !== optimisticPrompt.id))
        throw new Error("Failed to log prompt. The server might be unreachable.");
      } else {
        await refreshDataFromSupabase(syncKey);
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
      const { error } = await supabase.rpc('update_my_prompt', { 
        p_prompt_id: promptId, 
        p_bucket_id: syncKey, 
        p_new_note: newNote,
        p_new_output_tokens: newOutputTokens
      })
      if (error) {
        console.error('Error updating prompt:', error)
        refreshDataFromSupabase(syncKey) // Revert optimistic update
      } else {
        await broadcastChange('prompts_changed');
      }
    }
  }

  const deletePrompt = async (promptId: number) => {
    const originalHistory = history
    setHistory(prev => prev.filter(p => p.id !== promptId))
    if (syncKey) {
      const { error } = await supabase.rpc('delete_my_prompt', { p_prompt_id: promptId, p_bucket_id: syncKey })
      if (error) {
        console.error('Error deleting prompt:', error)
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
      const { error } = await supabase.rpc('delete_all_my_prompts', { p_bucket_id: syncKey })
      if (error) {
        console.error('Error deleting all prompts:', error)
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
      const { error } = await supabase.rpc('update_my_models', { p_bucket_id: syncKey, p_new_models: newModels })
      if (error) {
        console.error('Error updating models:', error)
        setModels(originalModels)
      } else {
        await broadcastChange('models_changed');
      }
    }
  }

  const migrateToCloud = async () => {
    setSyncing(true)
    try {
      const localModels = JSON.parse(localStorage.getItem(LOCAL_MODELS_STORAGE) || JSON.stringify(DEFAULT_MODELS))
      const localHistory = JSON.parse(localStorage.getItem(LOCAL_HISTORY_STORAGE) || '[]')

      const { data: newKey, error: createError } = await supabase.rpc('create_new_bucket', { p_models: localModels })
      if (createError || !newKey) {
        console.error('Error creating new session:', createError)
        throw new Error('Could not enable sync. Please try again.')
      }

      if (localHistory.length > 0) {
        for (const entry of localHistory) {
          await supabase.rpc('add_new_prompt', {
            p_bucket_id: newKey,
            p_model: entry.model,
            p_note: entry.note,
            p_output_tokens: entry.output_tokens || null,
            p_timestamp: new Date(entry.timestamp).toISOString(),
          })
        }
      }

      setSyncKey(newKey)
      localStorage.setItem(SYNC_KEY_STORAGE, newKey)
      localStorage.removeItem(LOCAL_HISTORY_STORAGE)
      localStorage.removeItem(LOCAL_MODELS_STORAGE)
      await refreshDataFromSupabase(newKey)
    } finally {
      setSyncing(false)
    }
  }

  const linkDeviceWithKey = async (key: string) => {
    if (!key || key.length < 36) {
      throw new Error('Invalid Sync Key format.')
    }
    setSyncing(true)
    try {
      const { data, error } = await supabase.rpc('get_my_bucket_data', { p_bucket_id: key })
      if (error || !data || data.length === 0) {
        console.error('Error verifying sync key:', error)
        throw new Error('Sync Key not found.')
      }

      localStorage.removeItem(LOCAL_HISTORY_STORAGE)
      localStorage.removeItem(LOCAL_MODELS_STORAGE)
      localStorage.setItem(SYNC_KEY_STORAGE, key)
      setSyncKey(key)
      await refreshDataFromSupabase(key)
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
        console.error('Error deleting account:', error);
        throw new Error('Could not delete account. Please try again.');
      }
      unlinkDevice();
    } finally {
      setSyncing(false)
    }
  }
  
  const handleExportData = async () => {
    let dataToExport;

    if (syncKey) {
        const { data: bucketDataArray, error: bucketError } = await supabase
            .rpc('get_my_bucket_data', { p_bucket_id: syncKey });

        const { data: promptsData, error: promptsError } = await supabase
            .rpc('get_my_prompts', { p_bucket_id: syncKey });

        if (bucketError || promptsError || !bucketDataArray || bucketDataArray.length === 0) {
            console.error("Export error:", bucketError || promptsError || "Bucket data not found.");
            alert("Failed to fetch data for export. Your sync key might be invalid or there was a network issue.");
            return;
        }

        const bucketData = bucketDataArray[0];

        dataToExport = {
            models: bucketData.models || [],
            history: promptsData.map((p: any) => ({ model: p.model, note: p.note, output_tokens: p.output_tokens || null, timestamp: new Date(p.timestamp).toISOString() }))
        };
    } else {
        dataToExport = {
            models: models,
            history: history.map(p => ({ model: p.model, note: p.note, output_tokens: p.output_tokens || null, timestamp: new Date(p.timestamp).toISOString() }))
        };
    }

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
    setSyncing(true)
    try {
        const text = await file.text()
        const importedData = JSON.parse(text)
        if (!importedData || !Array.isArray(importedData.models) || !Array.isArray(importedData.history)) {
            throw new Error('Invalid file format.');
        }
        
        if (syncKey) {
            await supabase.rpc('delete_all_my_prompts', { p_bucket_id: syncKey })
            await supabase.rpc('update_my_models', { p_bucket_id: syncKey, p_new_models: importedData.models })
            if (importedData.history.length > 0) {
                for (const entry of importedData.history) {
                    await supabase.rpc('add_new_prompt', { 
                        p_bucket_id: syncKey, 
                        p_model: entry.model, 
                        p_note: entry.note,
                        p_output_tokens: entry.output_tokens || null,
                        p_timestamp: entry.timestamp
                    });
                }
            }
            await broadcastChange('prompts_changed');
            await broadcastChange('models_changed');
            
            await refreshDataFromSupabase(syncKey)

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
    addPrompt,
    updatePrompt,
    deletePrompt,
    deleteAllPrompts,
    deleteAccount,
    updateUserModels,
    migrateToCloud,
    linkDeviceWithKey,
    unlinkDevice,
    handleExportData,
    handleImportData,
    setHistory,
    setModels,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};