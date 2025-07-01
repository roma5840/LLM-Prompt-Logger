// src/components/PromptLogger.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Model } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface PromptLoggerProps {
  addPrompt: (model: string, note: string) => Promise<void>
  models: Model[]
  onPromptLogged?: () => void
}

const NOTE_MAX_LENGTH = 1500;

export function PromptLogger({ addPrompt, models, onPromptLogged }: PromptLoggerProps) {
  const [selectedModel, setSelectedModel] = useState('')
  const [note, setNote] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModel || !note) {
      toast({
        title: "Missing Information",
        description: "Please select a model and enter a note.",
        variant: "destructive",
      })
      return
    }
    await addPrompt(selectedModel, note)
    setNote('')
    onPromptLogged?.()
  }

  return (
    <form onSubmit={handleSubmit} className="grid items-start gap-4 px-4 py-2 sm:px-6">
      <div className="grid gap-2">
        <Select onValueChange={setSelectedModel} value={selectedModel}>
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {models.map(model => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Enter prompt notes or tags..."
          rows={4}
          maxLength={NOTE_MAX_LENGTH}
        />
        <div className={cn(
            "text-right text-xs",
            note.length >= NOTE_MAX_LENGTH ? "text-red-500" : "text-muted-foreground"
        )}>
          {note.length} / {NOTE_MAX_LENGTH}
        </div>
      </div>
      <Button type="submit">
        Log Prompt
      </Button>
    </form>
  )
}