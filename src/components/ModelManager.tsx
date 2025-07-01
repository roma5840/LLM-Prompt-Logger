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
import { cn } from '@/lib/utils'

interface ModelManagerProps {
  models: Model[]
  updateUserModels: (models: Model[]) => void
  syncKey: string | null
  migrateToCloud: () => void
  linkDeviceWithKey: (key: string) => Promise<boolean>
  handleExportData: () => void
  handleImportData: (file: File) => void
}

const MODEL_NAME_MAX_LENGTH = 80;
const MODEL_LIMIT = 10;

export function ModelManager({
  models,
  updateUserModels,
  syncKey,
  migrateToCloud,
  linkDeviceWithKey,
  handleExportData,
  handleImportData,
}: ModelManagerProps) {
  const [newModel, setNewModel] = useState('')
  const [manualSyncKey, setManualSyncKey] = useState('')

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
    const scanner = new Html5Qrcode('qr-reader')
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText, decodedResult) => {
          onScanSuccess(decodedText)
          scanner.stop()
        },
        errorMessage => {
          // console.log(errorMessage)
        }
      )
    } catch (err) {
      console.error(err)
    }
  }

  return (
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
              <Button onClick={migrateToCloud} className="w-full">
                Enable Cloud Sync
              </Button>
              <Dialog>
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
                        linkDeviceWithKey(manualSyncKey)
                      }
                    }}
                  />
                  <DialogFooter>
                    <Button onClick={() => linkDeviceWithKey(manualSyncKey)}>
                      Link
                    </Button>
                  </DialogFooter>
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        startQrScanner(key => linkDeviceWithKey(key))
                      }
                    >
                      Start Scanner
                    </Button>
                  </DialogTrigger>
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
              type="file"
              accept=".json"
              onChange={e =>
                e.target.files && handleImportData(e.target.files[0])
              }
              className="w-full"
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}