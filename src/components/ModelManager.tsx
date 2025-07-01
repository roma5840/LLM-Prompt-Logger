'use client'

import { useState } from 'react'
import { Model } from '@/lib/types'
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'
import { useToast } from '@/hooks/use-toast'
import { useData } from '@/hooks/use-data'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModelManagerProps {
  models: Model[]
  updateUserModels: (models: Model[]) => void
  syncKey: string | null
  migrateToCloud: () => Promise<void>
  linkDeviceWithKey: (key: string) => Promise<void>
  handleExportData: () => void
  handleImportData: (file: File) => Promise<void>
}

const MODEL_NAME_MAX_LENGTH = 80;
const MODEL_LIMIT = 10;

export function ModelManager({
  models,
  updateUserModels,
  syncKey,
  migrateToCloud: migrateToCloudProp,
  linkDeviceWithKey: linkDeviceWithKeyProp,
  handleExportData,
  handleImportData: handleImportDataProp,
}: ModelManagerProps) {
  const [newModel, setNewModel] = useState('')
  const [manualSyncKey, setManualSyncKey] = useState('')
  const [isLinkDeviceDialogOpen, setLinkDeviceDialogOpen] = useState(false)
  const { toast } = useToast()
  const { syncing } = useData()
  const [fileToImport, setFileToImport] = useState<File | null>(null)

  const isModelLimitReached = models.length >= MODEL_LIMIT;

  const handleAddModel = () => {
    if (newModel && !models.includes(newModel) && !isModelLimitReached) {
      updateUserModels([...models, newModel])
      setNewModel('')
    }
  }

  const handleRemoveModel = (modelToRemove: string) => {
    updateUserModels(models.filter(m => m !== modelToRemove))
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
        errorMessage => {
          // console.log(errorMessage)
        }
      )
    } catch (err) {
      console.error(err)
      toast({
          title: "Scanner Error",
          description: "Could not start QR scanner. Please ensure camera permissions are granted.",
          variant: "destructive",
      })
    }
  }

  const handleMigrateToCloud = async () => {
    try {
      await migrateToCloudProp()
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
      await linkDeviceWithKeyProp(key)
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
        await handleImportDataProp(fileToImport);
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

  return (
    <>
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="manage-models">
          <AccordionTrigger>Manage Models</AccordionTrigger>
          <AccordionContent>
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
                  <p className="text-xs text-red-500 px-1">
                    You have reached the maximum of {MODEL_LIMIT} models.
                  </p>
                ) : (
                  <div className={cn(
                      "text-right text-xs pr-1",
                      newModel.length >= MODEL_NAME_MAX_LENGTH ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {newModel.length} / {MODEL_NAME_MAX_LENGTH}
                  </div>
                )}
              </div>
              <Button onClick={handleAddModel} disabled={isModelLimitReached || !newModel}>
                Add
              </Button>
            </div>
            <ul className="mt-2 space-y-1">
              {models.map(model => (
                <li
                  key={model}
                  className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-accent"
                >
                  <span className="break-all pr-2">{model}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                      >
                        X
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will remove the model "{model}" from your list. This will not delete any past prompts logged with this model.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className={buttonVariants({ variant: "destructive" })}
                          onClick={() => handleRemoveModel(model)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="data-sync">
          <AccordionTrigger>Data Sync</AccordionTrigger>
          <AccordionContent>
            {syncKey ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">Link Another Device</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Scan QR Code</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-center my-4">
                    <canvas
                      id="qr-code-canvas"
                      ref={canvas => canvas && generateQrCode(syncKey, canvas)}
                    ></canvas>
                  </div>
                  <Input value={syncKey} readOnly />
                </DialogContent>
              </Dialog>
            ) : (
              <div className="space-y-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                     <Button className="w-full" disabled={syncing}>
                        {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enable Cloud Sync
                     </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Enable Cloud Sync?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will upload your local data to a new, secure cloud account, allowing you to sync across devices. Are you sure you want to continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleMigrateToCloud} disabled={syncing}>
                        {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enable Sync
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Dialog open={isLinkDeviceDialogOpen} onOpenChange={setLinkDeviceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Link This Device
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Scan or Enter Sync Key</DialogTitle>
                    </DialogHeader>
                    <div id="qr-reader" className="my-2"></div>
                    <Input
                      placeholder="Enter sync key manually"
                      value={manualSyncKey}
                      onChange={e => setManualSyncKey(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleLinkDevice(manualSyncKey)
                        }
                      }}
                      disabled={syncing}
                    />
                    <DialogFooter className="gap-y-2 sm:gap-x-2 flex-col sm:flex-row">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          startQrScanner(key => handleLinkDevice(key))
                        }
                        disabled={syncing}
                      >
                        Start Scanner
                      </Button>
                      <Button onClick={() => handleLinkDevice(manualSyncKey)} disabled={syncing || !manualSyncKey}>
                        {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Link
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="data-management">
          <AccordionTrigger>Data Management</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <Button onClick={handleExportData} className="w-full">
                Export Data
              </Button>
              <Input
                id="import-file-input"
                type="file"
                accept=".json"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setFileToImport(e.target.files[0]);
                  } else {
                    setFileToImport(null);
                  }
                }}
                className="w-full"
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog open={!!fileToImport} onOpenChange={(open) => { if (!open) setFileToImport(null) } }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite Data?</AlertDialogTitle>
            <AlertDialogDescription>
              {syncKey
                ? 'This will overwrite all current cloud data with the contents of this file. This action cannot be undone.'
                : 'This will overwrite all your local data with the contents of this file. This action cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={syncing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} disabled={syncing}>
              {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}