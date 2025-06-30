"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trash2, PlusCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ModelManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  models: string[]
  setModels: (models: string[]) => void
}

const MAX_MODELS = 10;
const MAX_MODEL_LENGTH = 25;

export function ModelManager({ open, onOpenChange, models, setModels }: ModelManagerProps) {
  const [newModel, setNewModel] = React.useState("")
  const atModelLimit = models.length >= MAX_MODELS;

  const handleAddModel = () => {
    const trimmedModel = newModel.trim();
    if (trimmedModel && !models.includes(trimmedModel) && !atModelLimit) {
      setModels([...models, trimmedModel].sort())
      setNewModel("")
    }
  }

  const handleDeleteModel = (modelToDelete: string) => {
    setModels(models.filter((model) => model !== modelToDelete))
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddModel();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Models</DialogTitle>
          <DialogDescription>
            Add or remove LLM models from your list. This will update the dropdown in the prompt logger.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Models ({models.length}/{MAX_MODELS})</h4>
            <div className="flex flex-wrap gap-2">
              {models.length > 0 ? models.map((model) => (
                <Badge key={model} variant="secondary" className="flex items-center gap-2 bg-primary/10 text-primary/90 border-primary/20">
                  {model}
                  <button onClick={() => handleDeleteModel(model)} className="rounded-full hover:bg-destructive/20 p-0.5">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </Badge>
              )) : (
                  <p className="text-sm text-muted-foreground">No models configured.</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
             <h4 className="text-sm font-medium">Add New Model</h4>
            <div className="flex gap-2">
              <Input
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="e.g., Llama 3"
                disabled={atModelLimit}
                maxLength={MAX_MODEL_LENGTH}
              />
              <Button 
                type="button" 
                onClick={handleAddModel} 
                size="icon" 
                disabled={atModelLimit || !newModel.trim() || models.includes(newModel.trim())}
              >
                <PlusCircle className="h-4 w-4" />
                <span className="sr-only">Add Model</span>
              </Button>
            </div>
             <p className="text-xs text-muted-foreground text-right">{newModel.length}/{MAX_MODEL_LENGTH}</p>
            {atModelLimit && (
                 <Alert className="mt-2 border-amber-500/50 text-amber-500 [&>svg]:text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        You have reached the maximum of {MAX_MODELS} models.
                    </AlertDescription>
                </Alert>
            )}
            {models.includes(newModel.trim()) && newModel.trim().length > 0 && (
                 <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Model name already exists.
                    </AlertDescription>
                </Alert>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
