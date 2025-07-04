// src/hooks/use-data.tsx
"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_MODELS,
  LOCAL_HISTORY_STORAGE,
  LOCAL_MODELS_STORAGE,
  SYNC_KEY_STORAGE,
  SALT_STORAGE,
  NOTE_CHAR_LIMIT,
  LOCAL_ONLY_HISTORY_STORAGE,
  SESSION_MASTER_PASSWORD_STORAGE,
} from "@/lib/constants";
import {
  Conversation,
  Model,
  Turn,
  ImportConflict,
  ParsedImportData,
} from "@/lib/types";
import { useToast } from "./use-toast";
import {
  deriveEncryptionKey,
  getAccessToken,
  encrypt,
  decrypt,
} from "@/lib/crypto";
import { Resolution } from "@/components/ConflictResolver";

interface DataContextType {
  conversations: Conversation[];
  models: Model[];
  syncKey: string | null;
  loading: boolean;
  syncing: boolean;
  isLocked: boolean;
  noteCharacterLimit: number | null;
  createConversation: (title: string) => Promise<number | undefined>;
  addTurnToConversation: (
    conversationId: number,
    turn: Omit<Turn, "id" | "conversation_id" | "timestamp">
  ) => Promise<void>;
  deleteConversation: (id: number) => Promise<void>;
  updateConversationTitle: (id: number, newTitle: string) => Promise<void>;
  deleteAllData: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserModels: (newModels: Model[]) => Promise<void>;
  enableSyncAndMigrateData: (
    password: string,
    onConflict: (conflicts: ImportConflict[]) => void
  ) => Promise<void>;
  linkDeviceWithKey: (key: string, password: string) => Promise<void>;
  unlinkDevice: () => void;
  lock: () => void;
  unlock: (password: string) => Promise<void>;
  handleExportData: () => Promise<void>;
  handleImportData: (
    file: File,
    onConflict: (
      conflicts: ImportConflict[],
      parsedData: ParsedImportData
    ) => void
  ) => Promise<void>;
  resolveImportConflicts: (
    resolvedData: ParsedImportData,
    resolutions: Record<number, Resolution>
  ) => void;
  resolveMigrationConflicts: (
    resolutions: Record<number, Resolution>,
    password: string
  ) => Promise<void>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

const VERIFICATION_STRING = "PROMPT_LOG_OK";

const hashAccessToken = async (token: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [localOnlyConversations, setLocalOnlyConversations] = useState<
    Conversation[]
  >([]);
  const [models, setModels] = useState<Model[]>(DEFAULT_MODELS);
  const [syncKey, setSyncKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [masterPassword, setMasterPassword] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const conversationsRef = useRef(conversations);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  const localOnlyConversationsRef = useRef(localOnlyConversations);
  useEffect(() => {
    localOnlyConversationsRef.current = localOnlyConversations;
  }, [localOnlyConversations]);
  const modelsRef = useRef(models);
  useEffect(() => {
    modelsRef.current = models;
  }, [models]);

  const noteCharacterLimit = useMemo(
    () => (syncKey ? NOTE_CHAR_LIMIT : null),
    [syncKey]
  );

  const mergedConversations = useMemo(() => {
    return [...conversations, ...localOnlyConversations].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [conversations, localOnlyConversations]);

  const lock = useCallback(() => {
    localStorage.removeItem(SESSION_MASTER_PASSWORD_STORAGE);
    setEncryptionKey(null);
    setMasterPassword(null);
    setIsLocked(true);
  }, []);

  const unlinkDevice = useCallback(
    (options?: { showToast?: boolean; title?: string; message?: string }) => {
      const preservedConversations = localOnlyConversationsRef.current.map(
        (c) => ({ ...c, is_local_only: undefined })
      );
      const preservedModels = modelsRef.current;

      localStorage.removeItem(SESSION_MASTER_PASSWORD_STORAGE);
      localStorage.removeItem(SYNC_KEY_STORAGE);
      localStorage.removeItem(SALT_STORAGE);
      localStorage.removeItem(LOCAL_ONLY_HISTORY_STORAGE);
      localStorage.removeItem(LOCAL_HISTORY_STORAGE);
      localStorage.removeItem(LOCAL_MODELS_STORAGE);

      setSyncKey(null);
      setEncryptionKey(null);
      setMasterPassword(null);
      setIsLocked(false);
      setConversations(preservedConversations);
      setLocalOnlyConversations([]);
      setModels(preservedModels);

      if (options?.showToast) {
        toast({
          title: options.title || "Device Unlinked",
          description:
            options.message ||
            "Cloud sync has been disabled. Your local-only conversations have been preserved.",
          variant: "destructive",
          duration: 10000,
        });
      }
    },
    [toast]
  );

  const decryptConversations = useCallback(
    async (key: CryptoKey, encryptedConvos: any[]): Promise<Conversation[]> => {
      if (!encryptedConvos) return [];
      return Promise.all(
        encryptedConvos.map(async (c: any) => {
          try {
            const decryptedTitle = await decrypt(c.title, key);
            const decryptedMessages = c.messages
              ? await Promise.all(
                  c.messages.map(async (m: any) => {
                    const decryptedContent = m.content
                      ? await decrypt(m.content, key)
                      : "";
                    const decryptedInputTokens = m.input_tokens
                      ? await decrypt(m.input_tokens, key)
                      : null;
                    const decryptedOutputTokens = m.output_tokens
                      ? await decrypt(m.output_tokens, key)
                      : null;
                    return {
                      ...m,
                      content: decryptedContent,
                      input_tokens: decryptedInputTokens
                        ? parseInt(decryptedInputTokens, 10)
                        : null,
                      output_tokens: decryptedOutputTokens
                        ? parseInt(decryptedOutputTokens, 10)
                        : null,
                      timestamp: new Date(m.timestamp),
                    };
                  })
                )
              : [];

            return {
              ...c,
              title: decryptedTitle,
              messages: decryptedMessages,
              created_at: new Date(c.created_at),
              updated_at: new Date(c.updated_at),
            };
          } catch (e) {
            console.error(
              `Failed to decrypt conversation id ${c.id}. It may be corrupted.`,
              e
            );
            return {
              ...c,
              title: "[DECRYPTION FAILED]",
              messages: [],
              created_at: new Date(c.created_at),
              updated_at: new Date(c.updated_at),
            };
          }
        })
      );
    },
    []
  );

  const refreshDataFromSupabase = useCallback(
    async (key: string, encKey: CryptoKey) => {
      const { data: bucketData, error: bucketError } = await supabase.rpc(
        "get_my_bucket_data",
        { p_bucket_id: key }
      );
      if (bucketError) {
        console.error("Error refreshing data from cloud:", bucketError);
        return;
      }
      if (!bucketData || bucketData.length === 0) {
        unlinkDevice({
          showToast: true,
          title: "Account Not Found",
          message:
            "Your cloud account has been unlinked because it could not be found.",
        });
        return;
      }
      setModels(bucketData[0].models || [...DEFAULT_MODELS]);
      const localOnlyData = localStorage.getItem(LOCAL_ONLY_HISTORY_STORAGE);
      if (localOnlyData) {
        setLocalOnlyConversations(
          JSON.parse(localOnlyData).map((c: any) => ({
            ...c,
            created_at: new Date(c.created_at),
            updated_at: new Date(c.updated_at),
            messages: c.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          }))
        );
      }
      const { data: convosData, error: convosError } = await supabase.rpc(
        "get_all_data",
        { p_bucket_id: key }
      );
      if (convosError) {
        console.error("Error refreshing conversations:", convosError);
      } else {
        const decryptedConversations = await decryptConversations(
          encKey,
          convosData
        );
        setConversations(decryptedConversations);
      }
    },
    [unlinkDevice, decryptConversations]
  );

  const loadDataFromSupabase = useCallback(
    async (key: string, encKey: CryptoKey) => {
      setLoading(true);
      await refreshDataFromSupabase(key, encKey);
      setLoading(false);
    },
    [refreshDataFromSupabase]
  );

  const unlock = useCallback(
    async (password: string) => {
      setSyncing(true);
      try {
        const key = localStorage.getItem(SYNC_KEY_STORAGE);
        const salt = localStorage.getItem(SALT_STORAGE);
        if (!key || !salt) {
          throw new Error(
            "Cannot unlock, sync key or salt not found on device."
          );
        }
        const derivedKey = await deriveEncryptionKey(password, salt);
        const { data: bucketData, error: bucketError } = await supabase.rpc(
          "get_my_bucket_data",
          { p_bucket_id: key }
        );
        if (bucketError || !bucketData || bucketData.length === 0)
          throw new Error("Could not find account data to verify password.");
        const verificationHash = bucketData[0].verification_hash;
        if (!verificationHash)
          throw new Error("Account is corrupted. Cannot verify password.");
        try {
          const decrypted = await decrypt(verificationHash, derivedKey);
          if (decrypted !== VERIFICATION_STRING)
            throw new Error("Decryption test failed.");
        } catch (e) {
          throw new Error("Invalid master password.");
        }
        localStorage.setItem(SESSION_MASTER_PASSWORD_STORAGE, password);
        setEncryptionKey(derivedKey);
        setMasterPassword(password);
        setIsLocked(false);
        await loadDataFromSupabase(key, derivedKey);
      } finally {
        setSyncing(false);
      }
    },
    [loadDataFromSupabase]
  );

  useEffect(() => {
    const initialize = async () => {
      const key = localStorage.getItem(SYNC_KEY_STORAGE);
      if (key) {
        setSyncKey(key);
        const persistentPassword = localStorage.getItem(
          SESSION_MASTER_PASSWORD_STORAGE
        );
        if (persistentPassword) {
          await unlock(persistentPassword).catch((err) => {
            console.error("Persistent unlock failed, locking app.", err);
            lock();
          });
        } else {
          const localOnlyData = localStorage.getItem(
            LOCAL_ONLY_HISTORY_STORAGE
          );
          if (localOnlyData) {
            setLocalOnlyConversations(
              JSON.parse(localOnlyData).map((c: any) => ({
                ...c,
                created_at: new Date(c.created_at),
                updated_at: new Date(c.updated_at),
                messages: c.messages.map((m: any) => ({
                  ...m,
                  timestamp: new Date(m.timestamp),
                })),
              }))
            );
          }
          setIsLocked(true);
        }
      } else {
        const localHistory = localStorage.getItem(LOCAL_HISTORY_STORAGE);
        const localModelsData = localStorage.getItem(LOCAL_MODELS_STORAGE);
        if (localHistory)
          setConversations(
            JSON.parse(localHistory).map((c: any) => ({
              ...c,
              created_at: new Date(c.created_at),
              updated_at: new Date(c.updated_at),
              messages: c.messages.map((m: any) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              })),
            }))
          );
        if (localModelsData) setModels(JSON.parse(localModelsData));
      }
      setLoading(false);
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!syncKey) {
      localStorage.setItem(
        LOCAL_HISTORY_STORAGE,
        JSON.stringify(conversations)
      );
      localStorage.setItem(LOCAL_MODELS_STORAGE, JSON.stringify(models));
    }
  }, [conversations, models, syncKey]);
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(
        LOCAL_ONLY_HISTORY_STORAGE,
        JSON.stringify(localOnlyConversations)
      );
    }
  }, [localOnlyConversations, loading]);

  const broadcastChange = async (event: string) => {
    if (!syncKey) return;
    try {
      const channel = supabase.channel(`data-sync-${syncKey}`);
      await channel.send({ type: "broadcast", event });
    } catch (error) {
      console.error(`Failed to broadcast event '${event}':`, error);
    }
  };
  useEffect(() => {
    if (!syncKey || !encryptionKey || isLocked) return;
    const channel = supabase.channel(`data-sync-${syncKey}`);
    channel
      .on("broadcast", { event: "data_changed" }, () =>
        refreshDataFromSupabase(syncKey, encryptionKey)
      )
      .on("broadcast", { event: "models_changed" }, () =>
        refreshDataFromSupabase(syncKey, encryptionKey)
      )
      .on("broadcast", { event: "account_deleted" }, () =>
        unlinkDevice({
          showToast: true,
          title: "Account Deleted",
          message:
            "This cloud account was deleted from another device. This device has been unlinked.",
        })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncKey, encryptionKey, isLocked, refreshDataFromSupabase, unlinkDevice]);

  const findConflictsInConversations = (
    convos: Conversation[]
  ): ImportConflict[] => {
    const conflicts: ImportConflict[] = [];
    // Use the hardcoded limit here as this function is called before syncKey is set
    const limit = NOTE_CHAR_LIMIT;

    convos.forEach((convo) => {
      convo.messages.forEach((turn) => {
        if (turn.content && turn.content.length > limit) {
          conflicts.push({
            conversationId: convo.id,
            conversationTitle: convo.title,
            turnId: turn.id,
            turnContent: turn.content,
            turnTimestamp: turn.timestamp,
          });
        }
      });
    });
    return conflicts;
  };

  const _performSyncMigration = async (
    password: string,
    conversationsToSync: Conversation[],
    modelsToSync: Model[]
  ) => {
    const salt = window.btoa(
      String.fromCharCode.apply(
        null,
        Array.from(window.crypto.getRandomValues(new Uint8Array(16)))
      )
    );
    const derivedKey = await deriveEncryptionKey(password, salt);
    const verificationHash = await encrypt(VERIFICATION_STRING, derivedKey);
    const newAccessToken = await getAccessToken(password, salt);
    const accessTokenHash = await hashAccessToken(newAccessToken);

    const { data: newKey, error: createError } = await supabase.rpc(
      "create_new_bucket",
      {
        p_models: modelsToSync,
        p_salt: salt,
        p_verification_hash: verificationHash,
        p_access_token_hash: accessTokenHash,
      }
    );
    if (createError || !newKey)
      throw new Error("Could not create a cloud account. Please try again.");

    if (conversationsToSync.length > 0) {
      const encryptedPayload = await Promise.all(
        conversationsToSync.map(async (c) => ({
          title: await encrypt(c.title, derivedKey),
          created_at: c.created_at.toISOString(),
          updated_at: c.updated_at.toISOString(),
          messages: await Promise.all(
            c.messages.map(async (m) => ({
              model: m.model,
              role: m.role,
              content: await encrypt(m.content, derivedKey),
              input_tokens:
                m.input_tokens !== null
                  ? await encrypt(String(m.input_tokens), derivedKey)
                  : null,
              output_tokens:
                m.output_tokens !== null
                  ? await encrypt(String(m.output_tokens), derivedKey)
                  : null,
              timestamp: m.timestamp.toISOString(),
            }))
          ),
        }))
      );

      const { error: batchError } = await supabase.rpc(
        "batch_add_conversations",
        {
          p_bucket_id: newKey,
          p_access_token: newAccessToken,
          p_conversations_jsonb: encryptedPayload,
        }
      );

      if (batchError) {
        await supabase.rpc("delete_my_account", {
          p_bucket_id: newKey,
          p_access_token: newAccessToken,
        });
        throw new Error(`Failed to upload local data: ${batchError.message}`);
      }
    }

    localStorage.setItem(SYNC_KEY_STORAGE, newKey);
    localStorage.setItem(SALT_STORAGE, salt);
    localStorage.setItem(SESSION_MASTER_PASSWORD_STORAGE, password);
    localStorage.removeItem(LOCAL_HISTORY_STORAGE);

    setSyncKey(newKey);
    setEncryptionKey(derivedKey);
    setMasterPassword(password);
    setIsLocked(false);
    setConversations([]); // Clear out old local-only state
    await refreshDataFromSupabase(newKey, derivedKey);
  };

  const enableSyncAndMigrateData = async (
    password: string,
    onConflict: (conflicts: ImportConflict[]) => void
  ) => {
    setSyncing(true);
    try {
      const localConversationsToMigrate = conversationsRef.current;
      const conflicts = findConflictsInConversations(
        localConversationsToMigrate
      );
      if (conflicts.length > 0) {
        onConflict(conflicts);
        return;
      }

      const localModels = modelsRef.current;
      await _performSyncMigration(
        password,
        localConversationsToMigrate,
        localModels
      );
    } catch (e: any) {
      toast({
        title: "Error Enabling Sync",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const createConversation = async (
    title: string
  ): Promise<number | undefined> => {
    if (syncKey) {
      if (!encryptionKey || !masterPassword) throw new Error("App is locked.");
      const salt = localStorage.getItem(SALT_STORAGE);
      if (!salt) throw new Error("Salt not found.");
      const token = await getAccessToken(masterPassword, salt);
      const encryptedTitle = await encrypt(title, encryptionKey);
      const { data: newConversationId, error } = await supabase.rpc(
        "create_new_conversation",
        { p_bucket_id: syncKey, p_title: encryptedTitle, p_access_token: token }
      );
      if (error) {
        throw new Error("Failed to create conversation on the server.");
      }
      await refreshDataFromSupabase(syncKey, encryptionKey);
      await broadcastChange("data_changed");
      return newConversationId;
    } else {
      const newConversation: Conversation = {
        id: Date.now(),
        title,
        created_at: new Date(),
        updated_at: new Date(),
        messages: [],
      };
      setConversations((prev) => [newConversation, ...prev]);
      return newConversation.id;
    }
  };

  const addTurnToConversation = async (
    conversationId: number,
    turn: Omit<Turn, "id" | "conversation_id" | "timestamp">
  ) => {
    const targetConvo = mergedConversations.find(
      (c) => c.id === conversationId
    );
    if (!targetConvo) return;
    if (targetConvo.is_local_only) {
      const newTurn: Turn = {
        ...turn,
        id: Date.now(),
        conversation_id: conversationId,
        timestamp: new Date(),
      };
      setLocalOnlyConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, newTurn],
                updated_at: new Date(),
              }
            : c
        )
      );
    } else {
      if (syncKey) {
        if (!encryptionKey || !masterPassword)
          throw new Error("App is locked.");
        const salt = localStorage.getItem(SALT_STORAGE);
        if (!salt) throw new Error("Salt not found.");
        const token = await getAccessToken(masterPassword, salt);
        const { error } = await supabase.rpc("add_turn_to_conversation", {
          p_bucket_id: syncKey,
          p_conversation_id: conversationId,
          p_model: turn.model,
          p_content: await encrypt(turn.content, encryptionKey),
          p_input_tokens:
            turn.input_tokens !== null
              ? await encrypt(String(turn.input_tokens), encryptionKey)
              : null,
          p_output_tokens:
            turn.output_tokens !== null
              ? await encrypt(String(turn.output_tokens), encryptionKey)
              : null,
          p_access_token: token,
        });
        if (error) {
          toast({
            title: "Error",
            description: "Could not add turn.",
            variant: "destructive",
          });
          throw error;
        } else {
          await refreshDataFromSupabase(syncKey, encryptionKey);
          await broadcastChange("data_changed");
        }
      } else {
        const newTurn: Turn = {
          ...turn,
          id: Date.now(),
          conversation_id: conversationId,
          timestamp: new Date(),
        };
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, newTurn],
                  updated_at: new Date(),
                }
              : c
          )
        );
      }
    }
  };

  const deleteConversation = async (id: number) => {
    const targetConvo = mergedConversations.find((c) => c.id === id);
    if (!targetConvo) return;

    if (targetConvo.is_local_only) {
      setLocalOnlyConversations((prev) => prev.filter((c) => c.id !== id));
      router.push("/");
      return;
    }

    const originalConversations = conversations;
    setConversations((prev) => prev.filter((c) => c.id !== id));

    if (syncKey) {
      try {
        if (!encryptionKey || !masterPassword) throw new Error("App is locked.");
        const salt = localStorage.getItem(SALT_STORAGE);
        if (!salt) throw new Error("Salt not found.");
        const token = await getAccessToken(masterPassword, salt);

        const { error } = await supabase.rpc("delete_conversation", {
          p_bucket_id: syncKey,
          p_conversation_id: id,
          p_access_token: token,
        });

        if (error) {
          throw error;
        }

        await broadcastChange("data_changed");
        router.push("/");
      } catch (error) {
        setConversations(originalConversations);
        toast({
          title: "Error",
          description: "Failed to delete conversation from the cloud.",
          variant: "destructive",
        });
      }
    } else {
      router.push("/");
    }
  };

  const updateConversationTitle = async (id: number, newTitle: string) => {
    const targetConvo = mergedConversations.find((c) => c.id === id);
    if (!targetConvo) return;

    if (targetConvo.is_local_only) {
      setLocalOnlyConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, title: newTitle, updated_at: new Date() } : c
        )
      );
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, title: newTitle, updated_at: new Date() } : c
        )
      );
      if (syncKey) {
        if (!encryptionKey || !masterPassword)
          throw new Error("App is locked.");
        const salt = localStorage.getItem(SALT_STORAGE);
        if (!salt) throw new Error("Salt not found.");
        const token = await getAccessToken(masterPassword, salt);
        const encryptedTitle = await encrypt(newTitle, encryptionKey);
        const { error } = await supabase.rpc("update_conversation_title", {
          p_bucket_id: syncKey,
          p_conversation_id: id,
          p_new_title: encryptedTitle,
          p_access_token: token,
        });
        if (error) {
          await refreshDataFromSupabase(syncKey, encryptionKey);
        } else {
          await broadcastChange("data_changed");
        }
      }
    }
  };

  const deleteAllData = async () => {
    if (syncKey) {
      if (!encryptionKey || !masterPassword) throw new Error("App is locked.");
      const salt = localStorage.getItem(SALT_STORAGE);
      if (!salt) throw new Error("Salt not found.");
      const token = await getAccessToken(masterPassword, salt);

      const { error } = await supabase.rpc("delete_all_my_conversations", {
        p_bucket_id: syncKey,
        p_access_token: token,
      });

      if (error) {
        throw new Error("Failed to delete synced data. Please try again.");
      }

      setConversations([]);
      await broadcastChange("data_changed");
    } else {
      setConversations([]);
    }
  };

  const updateUserModels = async (newModels: Model[]) => {
    const originalModels = models;
    setModels(newModels);
    if (syncKey) {
      if (!encryptionKey || !masterPassword) throw new Error("App is locked.");
      const salt = localStorage.getItem(SALT_STORAGE);
      if (!salt) throw new Error("Salt not found.");
      const token = await getAccessToken(masterPassword, salt);
      const { error } = await supabase.rpc("update_my_models", {
        p_bucket_id: syncKey,
        p_new_models: newModels,
        p_access_token: token,
      });
      if (error) {
        setModels(originalModels);
      } else {
        await broadcastChange("models_changed");
      }
    }
  };
  const linkDeviceWithKey = async (key: string, password: string) => {
    if (!key || key.length < 36) {
      throw new Error("Invalid Sync Key format.");
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.rpc("get_my_bucket_data", {
        p_bucket_id: key,
      });
      if (error || !data || data.length === 0)
        throw new Error("Sync Key not found.");
      const bucket = data[0];
      const salt = bucket.salt;
      const verificationHash = bucket.verification_hash;
      if (!salt || !verificationHash)
        throw new Error("Account is not E2EE enabled or is corrupted.");
      const derivedKey = await deriveEncryptionKey(password, salt);
      try {
        const decrypted = await decrypt(verificationHash, derivedKey);
        if (decrypted !== VERIFICATION_STRING)
          throw new Error("Decryption test failed.");
      } catch (e) {
        throw new Error("Invalid master password.");
      }
      localStorage.setItem(SYNC_KEY_STORAGE, key);
      localStorage.setItem(SALT_STORAGE, salt);
      localStorage.setItem(SESSION_MASTER_PASSWORD_STORAGE, password);
      localStorage.removeItem(LOCAL_HISTORY_STORAGE);
      localStorage.removeItem(LOCAL_MODELS_STORAGE);
      setSyncKey(key);
      setEncryptionKey(derivedKey);
      setMasterPassword(password);
      setIsLocked(false);
      await refreshDataFromSupabase(key, derivedKey);
    } finally {
      setSyncing(false);
    }
  };

  const deleteAccount = async () => {
    if (!syncKey || !masterPassword) return;
    setSyncing(true);
    try {
      await broadcastChange("account_deleted");
      const salt = localStorage.getItem(SALT_STORAGE);
      if (!salt) throw new Error("Salt not found.");
      const token = await getAccessToken(masterPassword, salt);
      const { error } = await supabase.rpc("delete_my_account", {
        p_bucket_id: syncKey,
        p_access_token: token,
      });
      if (error) {
        throw new Error("Could not delete account. Please try again.");
      }
      unlinkDevice();
    } finally {
      setSyncing(false);
    }
  };

  const handleExportData = async () => {
    if (isLocked) {
      toast({
        title: "Unlock required",
        description: "Please unlock the app to export data.",
        variant: "destructive",
      });
      return;
    }
    const dataToExport = {
      models: models,
      conversations: mergedConversations.map((c) => ({
        title: c.title,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
        messages: c.messages.map((m) => ({
          model: m.model,
          role: m.role,
          content: m.content,
          input_tokens: m.input_tokens,
          output_tokens: m.output_tokens,
          timestamp: m.timestamp.toISOString(),
        })),
      })),
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `promptlog-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = async (
    file: File,
    onConflict: (
      conflicts: ImportConflict[],
      parsedData: ParsedImportData
    ) => void
  ) => {
    if (isLocked) {
      toast({
        title: "Unlock required",
        description: "Please unlock the app to import data.",
        variant: "destructive",
      });
      return;
    }
    setSyncing(true);
    let importHandled = false;
    try {
      const text = await file.text();
      const rawData = JSON.parse(text);
      if (
        !rawData ||
        !Array.isArray(rawData.conversations) ||
        !Array.isArray(rawData.models)
      ) {
        throw new Error(
          "Invalid file format: 'conversations' and 'models' arrays are required."
        );
      }

      const parsedData: ParsedImportData = {
        models: rawData.models,
        conversations: rawData.conversations.map((c: any, index: number) => ({
          id: c.id || Date.now() + index,
          title: c.title,
          created_at: new Date(c.created_at),
          updated_at: new Date(c.updated_at),
          messages: c.messages.map((m: any, msgIndex: number) => ({
            id: m.id || Date.now() + index + msgIndex,
            conversation_id: c.id,
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        })),
      };

      if (syncKey) {
        const conflicts = findConflictsInConversations(parsedData.conversations);
        if (conflicts.length > 0) {
          onConflict(conflicts, parsedData);
          importHandled = true; // Handed off to resolver
          return;
        }
      }

      setModels(parsedData.models);
      setConversations((prev) => [...prev, ...parsedData.conversations]);
      toast({
        title: "Import Successful",
        description: "Your data has been imported.",
      });
      importHandled = true;
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: `Reason: ${
          error.message || "An unknown error occurred during import."
        }`,
        variant: "destructive",
      });
    } finally {
      if (importHandled) {
        setSyncing(false);
      }
    }
  };

  const resolveImportConflicts = (
    resolvedData: ParsedImportData,
    resolutions: Record<number, Resolution>
  ) => {
    const localOnlyConversationIds = new Set<number>();
    Object.values(resolutions).forEach((res) => {
      if (res.choice === "keep_local") {
        localOnlyConversationIds.add(res.conversationId);
      } else if (res.choice === "edit") {
        const convoToUpdate = resolvedData.conversations.find(
          (c) => c.id === res.conversationId
        );
        if (convoToUpdate) {
          const turnIdToUpdate = Number(
            Object.keys(resolutions).find(
              (key) => resolutions[Number(key)] === res
            )
          );
          const turnToUpdate = convoToUpdate.messages.find(
            (t) => t.id === turnIdToUpdate
          );
          if (turnToUpdate) {
            turnToUpdate.content = res.content;
          }
        }
      }
    });

    const syncedConversations: Conversation[] = [];
    const localConversations: Conversation[] = [];

    resolvedData.conversations.forEach((convo) => {
      if (localOnlyConversationIds.has(convo.id)) {
        localConversations.push({ ...convo, is_local_only: true });
      } else {
        syncedConversations.push(convo);
      }
    });

    setModels(resolvedData.models);
    setConversations((prev) => [...prev, ...syncedConversations]);
    setLocalOnlyConversations((prev) => [...prev, ...localConversations]);

    toast({
      title: "Import Complete",
      description: "Conflicts resolved and data has been imported.",
    });
  };

  const resolveMigrationConflicts = async (
    resolutions: Record<number, Resolution>,
    password: string
  ) => {
    setSyncing(true);
    try {
      const localOnlyConversationIds = new Set<number>();
      const conversationsToUpdate: Conversation[] = JSON.parse(
        JSON.stringify(conversationsRef.current)
      );

      Object.entries(resolutions).forEach(([turnIdStr, res]) => {
        const turnId = Number(turnIdStr);
        if (res.choice === "keep_local") {
          localOnlyConversationIds.add(res.conversationId);
        } else if (res.choice === "edit") {
          const convoToUpdate = conversationsToUpdate.find(
            (c) => c.id === res.conversationId
          );
          if (convoToUpdate) {
            const turnToUpdate = convoToUpdate.messages.find(
              (t) => t.id === turnId
            );
            if (turnToUpdate) turnToUpdate.content = res.content;
          }
        }
      });

      const finalConversationsForSync = conversationsToUpdate.filter(
        (c) => !localOnlyConversationIds.has(c.id)
      );
      const finalLocalOnlyConversations = conversationsToUpdate
        .filter((c) => localOnlyConversationIds.has(c.id))
        .map((c) => ({ ...c, is_local_only: true }));

      setLocalOnlyConversations((prev) => [
        ...prev,
        ...finalLocalOnlyConversations,
      ]);

      const modelsToSync = modelsRef.current;
      await _performSyncMigration(
        password,
        finalConversationsForSync,
        modelsToSync
      );

      toast({
        title: "Sync Enabled",
        description: "Your data has been successfully encrypted and synced.",
      });
    } catch (e: any) {
      toast({
        title: "Error Enabling Sync",
        description: e.message,
        variant: "destructive",
      });
      // Re-throw to allow UI to handle it if necessary
      throw e;
    } finally {
      setSyncing(false);
    }
  };

  const value = {
    conversations: mergedConversations,
    models,
    syncKey,
    loading,
    syncing,
    isLocked,
    noteCharacterLimit,
    createConversation,
    addTurnToConversation,
    deleteConversation,
    updateConversationTitle,
    deleteAllData,
    deleteAccount,
    updateUserModels,
    enableSyncAndMigrateData,
    linkDeviceWithKey,
    unlinkDevice,
    lock,
    unlock,
    handleExportData,
    handleImportData,
    resolveImportConflicts,
    resolveMigrationConflicts,
    setConversations,
    setModels,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};