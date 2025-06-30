'use client'

import { useState } from 'react'
import { Model } from '@/lib/types'
import { Button } from '@/components/ui/button'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'

interface ModelManagerProps {
  models: Model[]
  updateUserModels: (models: Model[]) => void
  syncKey: string | null
  migrateToCloud: () => void
  linkDeviceWithKey: (key: string) => Promise<boolean>
  handleExportData: () => void
  handleImportData: (file: File) => void
}

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

  const handleAddModel = () => {
    if (newModel && !models.includes(newModel)) {
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
          <div className="flex space-x-2">
            <Input
              value={newModel}
              onChange={e => setNewModel(e.target.value)}
              placeholder="New model name"
            />
            <Button onClick={handleAddModel}>Add</Button>
          </div>
          <ul className="mt-2 space-y-1">
            {models.map(model => (
              <li
                key={model}
                className="flex justify-between items-center text-sm"
              >
                {model}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveModel(model)}
                >
                  X
                </Button>
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
                <canvas
                  id="qr-code-canvas"
                  ref={canvas => canvas && generateQrCode(syncKey, canvas)}
                ></canvas>
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
                  <div id="qr-reader"></div>
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
