'use client'

import { useState, useMemo } from 'react'
import { useData } from '@/hooks/use-data'
import { useToast } from '@/hooks/use-toast'
import { MainLayout } from '@/components/MainLayout'
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
import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const MODEL_NAME_MAX_LENGTH = 80;
const MODEL_LIMIT = 10;

export default function SettingsPage() {
  const data = useData()
  const { toast } = useToast()

  const [newModel, setNewModel] = useState('')
  const [manualSyncKey, setManualSyncKey] = useState('')
  const [isLinkDeviceDialogOpen, setLinkDeviceDialogOpen] = useState(false)
  const [fileToImport, setFileToImport] = useState<File | null>(null)

  const isModelLimitReached = data.models.length >= MODEL_LIMIT;

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
        const modelBytes = new TextEncoder().encode(prompt.model).length;
        const noteBytes = new TextEncoder().encode(prompt.note).length;
        const overheadBytes = 56; // Estimated overhead per row in Supabase
        return acc + modelBytes + noteBytes + overheadBytes;
    }, 0);
    return totalBytes;
  }, [data.history, data.syncKey]);
  
  const formattedSize = formatBytes(estimatedStorage);

  const handleAddModel = () => {
    if (newModel && !data.models.includes(newModel) && !isModelLimitReached) {
      data.updateUserModels([...data.models, newModel])
      setNewModel('')
    }
  }

  const handleRemoveModel = (modelToRemove: string) => {
    data.updateUserModels(data.models.filter(m => m !== modelToRemove))
  }

  const handleDeleteAllData = async () => {
    await data.deleteAllPrompts();
    toast({
      title: "Success",
      description: "All your data has been deleted.",
    });
  }

  const handleMigrateToCloud = async () => {
    try {
      await data.migrateToCloud()
      toast({
        title: "Success!",
        description: "Cloud sync has been enabled.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleLinkDevice = async (key: string) => {
    if (!key) return
    try {
      await data.linkDeviceWithKey(key)
      setLinkDeviceDialogOpen(false)
      setManualSyncKey('')
      toast({
        title: "Success!",
        description: "This device has been linked.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleImport = async () => {
    if (!fileToImport) return;
    try {
        await data.handleImportData(fileToImport);
        toast({
            title: "Import Successful",
            description: "Your data has been imported.",
        });
    } catch (error: any) {
        toast({
            title: "Import Failed",
            description: error.message,
            variant: "destructive",
        });
    } finally {
        setFileToImport(null);
        const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
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
              <CardTitle>Manage Models</CardTitle>
              <CardDescription>Add or remove the LLM models you use.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-2">
                <div className="flex-grow space-y-1">
                  <Input
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                    placeholder={isModelLimitReached ? "Model limit reached" : "New model name"}
                    maxLength={MODEL_NAME_MAX_LENGTH}
                    disabled={isModelLimitReached}
                  />
                  {isModelLimitReached ? (
                    <p className="text-xs text-red-500 px-1">You have reached the maximum of {MODEL_LIMIT} models.</p>
                  ) : (
                    <div className={cn("text-right text-xs pr-1", newModel.length >= MODEL_NAME_MAX_LENGTH ? "text-red-500" : "text-muted-foreground")}>
                      {newModel.length} / {MODEL_NAME_MAX_LENGTH}
                    </div>
                  )}
                </div>
                <Button onClick={handleAddModel} disabled={isModelLimitReached || !newModel}>Add</Button>
              </div>
              <ul className="mt-4 space-y-1">
                {data.models.map(model => (
                  <li key={model} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-accent">
                    <span className="break-all pr-2">{model}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="sm">Remove</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>This action will remove the model "{model}" from your list. It will not delete past prompts logged with this model.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={() => handleRemoveModel(model)}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sync & Data Management</CardTitle>
              <CardDescription>Enable cloud sync or manage your local data.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {data.syncKey ? (
                  <Dialog>
                    <DialogTrigger asChild><Button className="w-full">Link Another Device</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Scan QR Code</DialogTitle></DialogHeader>
                      <div className="flex justify-center my-4"><canvas id="qr-code-canvas" ref={canvas => canvas && generateQrCode(data.syncKey!, canvas)}></canvas></div>
                      <Input value={data.syncKey} readOnly />
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="space-y-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button className="w-full" disabled={data.syncing}>{data.syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enable Cloud Sync</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Enable Cloud Sync?</AlertDialogTitle>
                          <AlertDialogDescription>This will upload your local data to a new, secure cloud account, allowing you to sync across devices. Are you sure?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleMigrateToCloud} disabled={data.syncing}>{data.syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enable Sync</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Dialog open={isLinkDeviceDialogOpen} onOpenChange={setLinkDeviceDialogOpen}>
                      <DialogTrigger asChild><Button variant="outline" className="w-full">Link This Device</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Scan or Enter Sync Key</DialogTitle></DialogHeader>
                        <div id="qr-reader" className="my-2"></div>
                        <Input placeholder="Enter sync key manually" value={manualSyncKey} onChange={e => setManualSyncKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLinkDevice(manualSyncKey)} disabled={data.syncing} />
                        <DialogFooter className="gap-y-2 sm:gap-x-2 flex-col sm:flex-row">
                          <Button variant="secondary" onClick={() => startQrScanner(key => handleLinkDevice(key))} disabled={data.syncing}>Start Scanner</Button>
                          <Button onClick={() => handleLinkDevice(manualSyncKey)} disabled={data.syncing || !manualSyncKey}>{data.syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Link</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                <div className="space-y-2">
                  <Button onClick={data.handleExportData} variant="outline" className="w-full">Export Data</Button>
                  <div className="flex w-full items-center space-x-2">
                    <Input id="import-file-input" type="file" accept=".json" onChange={e => setFileToImport(e.target.files ? e.target.files[0] : null)} className="w-full" />
                  </div>
                </div>
              </div>

              {data.syncKey && data.history.length > 0 && (
                <div className="text-xs text-center text-muted-foreground p-2 border rounded-md bg-muted/50">
                  <p>Estimated Cloud Storage: <span className="font-semibold">{formattedSize}</span></p>
                  <p className="mt-1">Based on {data.history.length} synced prompts.</p>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete All Data</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all your prompt history.{data.syncKey ? " This will affect all synced devices." : ""}
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
            </CardContent>
          </Card>
        </div>
      </main>
      <AlertDialog open={!!fileToImport} onOpenChange={(open) => { if (!open) setFileToImport(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite Data?</AlertDialogTitle>
            <AlertDialogDescription>
              {data.syncKey ? 'This will overwrite all current cloud data with the contents of this file. This action cannot be undone.' : 'This will overwrite all your local data with the contents of this file. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={data.syncing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} disabled={data.syncing}>{data.syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}