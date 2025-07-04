'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useData } from '@/hooks/use-data'
import { useToast } from '@/hooks/use-toast'
import { MainLayout } from '@/components/MainLayout'
import { MigrationConflictResolver } from '@/components/MigrationConflictResolver'
import { E2EEExplanation } from '@/components/E2EEExplanation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'
import { Loader2, AlertTriangle, ShieldCheck, ShieldOff, Info, Trash2, Save, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Prompt, Model } from '@/lib/types'
import { LOCAL_HISTORY_STORAGE } from '@/lib/constants'
import { Label } from '@/components/ui/label'

const MODEL_NAME_MAX_LENGTH = 80;
const MODEL_LIMIT = 10;

export default function SettingsPage() {
  const data = useData()
  const { toast } = useToast()

  const [editableModels, setEditableModels] = useState<Model[]>([]);
  const [newModelName, setNewModelName] = useState('');

  const [manualSyncKey, setManualSyncKey] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [isLinkDeviceDialogOpen, setLinkDeviceDialogOpen] = useState(false)
  const [fileToImport, setFileToImport] = useState<File | null>(null)
  const [isMigrateDialogOpen, setIsMigrateDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isLinkConfirmationOpen, setIsLinkConfirmationOpen] = useState(false);

  // State for the new migration flow
  const [isResolverOpen, setResolverOpen] = useState(false);
  const [conflicts, setConflicts] = useState<Prompt[]>([]);
  const [passwordForMigration, setPasswordForMigration] = useState('');
  
  useEffect(() => {
    // Deep copy to avoid direct state mutation when user edits
    setEditableModels(JSON.parse(JSON.stringify(data.models)));
  }, [data.models]);

  const isModelLimitReached = editableModels.length >= MODEL_LIMIT;
  const haveModelsChanged = useMemo(() => JSON.stringify(data.models) !== JSON.stringify(editableModels), [data.models, editableModels]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  const estimatedStorage = useMemo(() => {
    if (!data.syncKey || !data.history) return 0;
    const totalBytes = data.history.reduce((acc, prompt) => {
        if (prompt.is_local_only) return acc;
        const modelBytes = new TextEncoder().encode(prompt.model).length;
        const noteBytes = new TextEncoder().encode(prompt.note).length;
        const overheadBytes = 56;
        return acc + modelBytes + noteBytes + overheadBytes;
    }, 0);
    return totalBytes;
  }, [data.history, data.syncKey]);
  
  const formattedSize = formatBytes(estimatedStorage);

  const handleAddModel = () => {
    if (newModelName && !editableModels.some(m => m.name === newModelName) && !isModelLimitReached) {
      const newModel: Model = { name: newModelName, inputCost: 0, outputCost: 0 };
      setEditableModels([...editableModels, newModel]);
      setNewModelName('');
    }
  };

  const handleUpdateModel = (index: number, field: keyof Model, value: string | number) => {
    const updatedModels = [...editableModels];
    const modelToUpdate = { ...updatedModels[index] }; // Create a shallow copy of the object

    if (field === 'name' && typeof value === 'string') {
        modelToUpdate.name = value;
    } else if ((field === 'inputCost' || field === 'outputCost') && typeof value === 'number') {
        modelToUpdate[field] = value >= 0 ? value : 0;
    }
    updatedModels[index] = modelToUpdate;
    setEditableModels(updatedModels);
  };

  const handleRemoveModel = (index: number) => {
    const updatedModels = [...editableModels];
    updatedModels.splice(index, 1);
    setEditableModels(updatedModels);
  };
  
  const handleDiscardChanges = () => {
    setEditableModels(JSON.parse(JSON.stringify(data.models)));
    toast({
        title: "Changes Discarded",
        description: "Your model configurations have been reset.",
        variant: "default",
    });
  }

  const handleSaveChanges = async () => {
    try {
        await data.updateUserModels(editableModels);
        toast({
            title: "Success",
            description: "Your model configurations have been saved.",
        });
    } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteAllData = async () => {
    try {
        await data.deleteAllPrompts();
        toast({
          title: "Success",
          description: data.syncKey
            ? "All your synced data has been deleted."
            : "All your local prompt history has been deleted.",
        });
    } catch(e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  const handleUnlinkDevice = () => {
    data.unlinkDevice();
    toast({
      title: "Device Unlinked",
      description: "This device has been unlinked. Your local-only notes have been preserved.",
    });
  };

  const handleDeleteAccount = async () => {
    try {
      await data.deleteAccount();
      toast({
        title: "Account Deleted",
        description: "Your cloud account has been permanently deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInitiateMigration = async () => {
    if (!masterPassword) {
      toast({ title: "Password Required", description: "Please set a master password.", variant: "destructive" });
      return;
    }

    const conflictNotes = data.checkForMigrationConflicts();
    
    if (conflictNotes.length > 0) {
        setConflicts(conflictNotes);
        setPasswordForMigration(masterPassword);
        setIsMigrateDialogOpen(false);
        setResolverOpen(true);
    } else {
        // No conflicts, proceed with direct migration
        try {
            const localHistoryRaw = localStorage.getItem(LOCAL_HISTORY_STORAGE);
            const notesToMigrate = localHistoryRaw ? JSON.parse(localHistoryRaw) : [];
            await data.completeMigration(masterPassword, notesToMigrate, []);
            toast({
                title: "Success!",
                description: "Cloud sync has been enabled and your data is encrypted.",
            });
            setIsMigrateDialogOpen(false);
            setMasterPassword('');
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    }
  };

  const handleResolveConflicts = useCallback(async (notesToMigrate: Prompt[], notesToKeepLocal: Prompt[]) => {
      try {
          const allLocalNotesRaw = localStorage.getItem(LOCAL_HISTORY_STORAGE);
          const allLocalNotes: Prompt[] = allLocalNotesRaw ? JSON.parse(allLocalNotesRaw) : [];
          
          const conflictIds = new Set(conflicts.map(c => c.id));
          const nonConflictNotes = allLocalNotes.filter(p => !conflictIds.has(p.id));

          await data.completeMigration(passwordForMigration, [...nonConflictNotes, ...notesToMigrate], notesToKeepLocal);
          
          toast({
              title: "Migration Complete!",
              description: "Cloud sync is now enabled.",
          });
      } catch (error: any) {
          toast({ title: "Migration Failed", description: error.message, variant: "destructive" });
      } finally {
          setResolverOpen(false);
          setConflicts([]);
          setPasswordForMigration('');
          setMasterPassword('');
      }
  }, [data, conflicts, passwordForMigration, toast]);

  const handleCancelConflictResolution = () => {
      setResolverOpen(false);
      setConflicts([]);
      setPasswordForMigration('');
      setMasterPassword('');
      toast({ title: "Sync Canceled", description: "The cloud sync process was canceled." });
  };

  const executeLinkDevice = async () => {
    if (!manualSyncKey || !masterPassword) {
      toast({ title: "Missing Information", description: "Please provide both a Sync Key and your Master Password.", variant: "destructive" });
      return;
    }

    try {
      await data.linkDeviceWithKey(manualSyncKey, masterPassword)
      setLinkDeviceDialogOpen(false)
      setManualSyncKey('')
      setMasterPassword('')
      toast({
        title: "Success!",
        description: "This device has been linked and your data decrypted.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLinkConfirmationOpen(false);
    }
  }
  
  const handleInitiateLinkDevice = () => {
    if (!manualSyncKey || !masterPassword) {
      toast({ title: "Missing Information", description: "Please provide both a Sync Key and your Master Password.", variant: "destructive" });
      return;
    }
    if (!data.syncKey && data.history.length > 0) {
        setIsLinkConfirmationOpen(true);
    } else {
        executeLinkDevice();
    }
  };
  
  const handleLinkWithQrCode = async (key: string) => {
      setManualSyncKey(key);
      const scannerElement = document.getElementById('qr-reader');
      if (scannerElement) scannerElement.innerHTML = '<p class="text-center text-green-600">Sync Key scanned! Now enter your Master Password below and click Link.</p>';
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      setFileToImport(file);
      setIsImportDialogOpen(true);
    }
  };

  const handleImport = async () => {
    if (!fileToImport) return;
    try {
        await data.handleImportData(fileToImport);
        toast({
            title: "Import Successful",
            description: "Your data has been imported.",
        });
        setIsImportDialogOpen(false);
    } catch (error: any) {
        toast({
            title: "Import Failed",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        setFileToImport(null);
    }
  }
  
  const generateQrCode = (text: string, canvas: HTMLCanvasElement) => {
    QRCode.toCanvas(canvas, text, { width: 256 }, error => {
      if (error) console.error(error)
    })
  }

  const startQrScanner = async (onScanSuccess: (decodedText: string) => void) => {
    const qrReaderElement = document.getElementById('qr-reader')
    if (!qrReaderElement) {
        console.error("QR reader element not found");
        return;
    }

    const scanner = new Html5Qrcode('qr-reader')
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText, decodedResult) => {
          onScanSuccess(decodedText)
          scanner.stop().catch(err => console.error("Error stopping scanner", err));
        },
        errorMessage => {}
      )
    } catch (err) {
      toast({
          title: "Scanner Error",
          description: "Could not start QR scanner. Please ensure camera permissions are granted.",
          variant: "destructive",
      })
    }
  }

  return (
    <MainLayout>
      <main className="flex-1 py-4 md:py-6 lg:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h1>
        </div>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Models & Costs</CardTitle>
              <CardDescription>Add, remove, and define costs for the LLM models you use.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editableModels.map((model, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-start">
                      <Input
                        value={model.name}
                        onChange={e => handleUpdateModel(index, 'name', e.target.value)}
                        placeholder="Model name"
                        maxLength={MODEL_NAME_MAX_LENGTH}
                        className="text-base font-semibold !mt-0"
                      />
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => handleRemoveModel(index)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`input-cost-${index}`}>Input Cost / 1M tokens ($)</Label>
                        <Input
                          id={`input-cost-${index}`}
                          type="number"
                          step="0.0001"
                          min="0"
                          value={model.inputCost}
                          onChange={e => handleUpdateModel(index, 'inputCost', parseFloat(e.target.value))}
                          placeholder="e.g., 0.50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`output-cost-${index}`}>Output Cost / 1M tokens ($)</Label>
                        <Input
                          id={`output-cost-${index}`}
                          type="number"
                          step="0.0001"
                          min="0"
                          value={model.outputCost}
                          onChange={e => handleUpdateModel(index, 'outputCost', parseFloat(e.target.value))}
                          placeholder="e.g., 1.50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="flex items-start space-x-2">
                  <div className="flex-grow space-y-1">
                      <Input
                          value={newModelName}
                          onChange={e => setNewModelName(e.target.value)}
                          placeholder={isModelLimitReached ? "Model limit reached" : "New model name"}
                          maxLength={MODEL_NAME_MAX_LENGTH}
                          disabled={isModelLimitReached}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                      />
                      {isModelLimitReached ? (
                          <p className="text-xs text-red-500 px-1">You have reached the maximum of {MODEL_LIMIT} models.</p>
                      ) : (
                          <div className={cn("text-right text-xs pr-1", newModelName.length >= MODEL_NAME_MAX_LENGTH ? "text-red-500" : "text-muted-foreground")}>
                              {newModelName.length} / {MODEL_NAME_MAX_LENGTH}
                          </div>
                      )}
                  </div>
                  <Button onClick={handleAddModel} disabled={isModelLimitReached || !newModelName}>Add Model</Button>
              </div>

              {haveModelsChanged && (
                <div className="mt-6 p-4 bg-secondary/50 border rounded-lg flex justify-end gap-2">
                    <Button onClick={handleDiscardChanges} variant="outline">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Discard Changes
                    </Button>
                    <Button onClick={handleSaveChanges}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                    </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sync & Data Management</CardTitle>
              <CardDescription>
                {data.syncKey ? "Manage your end-to-end encrypted cloud sync." : "Enable E2EE cloud sync or manage local data."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-medium leading-none flex items-center gap-2">
                    {data.syncKey ? <><ShieldCheck className="h-4 w-4 text-green-600" />E2E Cloud Sync Enabled</> : "Cloud Sync"}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {data.syncKey 
                          ? "Your data is encrypted and unreadable by the server." 
                          : "Enable sync to encrypt and back up your data."
                      }
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                           <Info className="mr-1 h-3 w-3" /> How it works
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xl flex flex-col h-[90vh] p-0">
                        <DialogHeader className="p-6 pb-4">
                          <DialogTitle className="text-center text-xl">
                              <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit mb-4">
                                  <ShieldCheck className="w-10 h-10 text-primary" />
                              </div>
                              Your Privacy Comes First
                          </DialogTitle>
                          <DialogDescription className="text-center">
                              Here's how our End-to-End Encryption (E2EE) keeps your data safe.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 min-h-0 px-6">
                          <ScrollArea className="h-full pr-4 -mr-4">
                            <E2EEExplanation />
                          </ScrollArea>
                        </div>
                        <DialogFooter className="p-6 pt-4 border-t">
                          <DialogClose asChild>
                            <Button className="w-full">Got it</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  {data.syncKey ? (
                    <>
                      <Button variant="outline" onClick={data.lock}>
                        <ShieldOff className="mr-2 h-4 w-4" /> Lock App
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild><Button>Link Another Device</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Link Another Device</DialogTitle>
                            <DialogDescription>On the new device, enter the Sync Key below and your Master Password.</DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-center my-4"><canvas id="qr-code-canvas" ref={canvas => canvas && data.syncKey && generateQrCode(data.syncKey, canvas)}></canvas></div>
                          <Input value={data.syncKey || ''} readOnly />
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline">Unlink This Device</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Unlink this device?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the sync key and encryption key from this device and reset the app. Your encrypted data in the cloud will not be affected. Your local-only notes will be preserved.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handleUnlinkDevice}>
                              Unlink Device
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <>
                      <Dialog open={isMigrateDialogOpen} onOpenChange={(open) => !data.syncing && setIsMigrateDialogOpen(open)}>
                        <DialogTrigger asChild>
                          <Button disabled={data.syncing}>
                            {data.syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enable Cloud Sync
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Enable End-to-End Encrypted Sync</DialogTitle>
                            <DialogDescription>Create a master password to encrypt your data.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>IMPORTANT: Save Your Password!</AlertTitle>
                              <AlertDescription>
                                This password encrypts your data. We cannot see it and cannot recover it for you. If you forget this password, your synced data will be permanently lost.
                              </AlertDescription>
                            </Alert>
                            <Input 
                                type="password" 
                                placeholder="Create a strong master password" 
                                value={masterPassword}
                                onChange={e => setMasterPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleInitiateMigration()}
                                disabled={data.syncing}
                            />
                          </div>
                          <DialogFooter className="pt-2">
                             <Button variant="outline" onClick={() => setIsMigrateDialogOpen(false)} disabled={data.syncing}>Cancel</Button>
                            <Button onClick={handleInitiateMigration} disabled={data.syncing || !masterPassword}>
                              {data.syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enable & Encrypt
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Dialog open={isLinkDeviceDialogOpen} onOpenChange={setLinkDeviceDialogOpen}>
                        <DialogTrigger asChild><Button variant="outline">Link This Device</Button></DialogTrigger>
                        <DialogContent>
                           <DialogHeader>
                            <DialogTitle>Link Device & Decrypt Data</DialogTitle>
                            <DialogDescription>Enter the Sync Key from another device and your Master Password.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div id="qr-reader" className="my-2"></div>
                            <Input placeholder="Enter Sync Key" value={manualSyncKey} onChange={e => setManualSyncKey(e.target.value)} disabled={data.syncing} />
                            <Input 
                                type="password" 
                                placeholder="Enter your Master Password" 
                                value={masterPassword}
                                onChange={e => setMasterPassword(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleInitiateLinkDevice()}
                                disabled={data.syncing} 
                            />
                          </div>
                          <DialogFooter className="gap-y-2 sm:gap-x-2 flex-col sm:flex-row pt-4">
                            <Button variant="secondary" onClick={() => startQrScanner(key => handleLinkWithQrCode(key))} disabled={data.syncing}>Scan QR</Button>
                            <Button onClick={handleInitiateLinkDevice} disabled={data.syncing || !manualSyncKey || !masterPassword}>{data.syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Link & Decrypt</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h3 className="font-medium leading-none">Data Portability</h3>
                  <p className="text-sm text-muted-foreground mt-1">Export your decrypted data or import from a backup.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <Button onClick={data.handleExportData} variant="outline" disabled={data.isLocked}>Export Data</Button>
                  <Input
                    id="import-file-input"
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="sm:max-w-xs"
                    disabled={data.isLocked}
                  />
                </div>
              </div>
              
              {data.syncKey && data.history.length > 0 && (
                <div className="text-xs text-center text-muted-foreground p-2 border rounded-md bg-muted/50">
                  <p>Estimated Original Data Size: <span className="font-semibold">{formattedSize}</span></p>
                  <p className="mt-1">Based on {data.history.filter(p => !p.is_local_only).length} synced prompts. Stored size will be larger due to encryption.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription className="text-destructive/90">These actions are permanent and cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {data.syncKey ? (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={data.history.filter(p => !p.is_local_only).length === 0 || data.isLocked}>Delete All Synced Data</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all encrypted prompt history from your cloud account, affecting all synced devices. This action will not affect your local-only notes. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handleDeleteAllData}>
                            Delete All Synced Data
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={data.isLocked}>Delete Account</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete your entire cloud account, including your sync key, salt, models, and all encrypted prompt history. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={data.syncing}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className={buttonVariants({ variant: "destructive" })}
                            onClick={handleDeleteAccount}
                            disabled={data.syncing}
                          >
                            {data.syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Account Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={data.history.length === 0}>Delete All Local Data</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all prompt history from this device's local storage.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handleDeleteAllData}>
                          Delete All Data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MigrationConflictResolver
        isOpen={isResolverOpen}
        onOpenChange={setResolverOpen}
        conflicts={conflicts}
        onResolve={handleResolveConflicts}
        onCancel={handleCancelConflictResolution}
      />
      <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Data Import</AlertDialogTitle>
            <AlertDialogDescription>
              {data.syncKey ? 'This will overwrite and re-encrypt all current cloud data with the contents of this file. This action cannot be undone.' : 'This will overwrite all your local data with the contents of this file. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={data.syncing} onClick={() => setIsImportDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} disabled={data.syncing}>
                {data.syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isLinkConfirmationOpen} onOpenChange={setIsLinkConfirmationOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Overwrite Local Data?</AlertDialogTitle>
                <AlertDialogDescription>
                    Linking this device will replace its current local data with the data from your cloud account. Any notes you've made on this device will be permanently deleted. Are you sure you want to continue?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={executeLinkDevice}>Continue & Link</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}