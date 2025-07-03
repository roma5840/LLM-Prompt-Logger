// src/components/PromptLogger.tsx
'use client'

import { useState, useMemo } from 'react'
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
import { useData } from '@/hooks/use-data'
import { cn } from '@/lib/utils'
import { Loader2, ChevronsUpDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'

interface PromptLoggerProps {
  addPrompt: (model: string, note: string, outputTokens: number | null) => Promise<void>
  models: Model[]
  onPromptLogged?: () => void
  isSubmitting: boolean
  setIsSubmitting: (isSubmitting: boolean) => void
}

export function PromptLogger({ addPrompt, models, onPromptLogged, isSubmitting, setIsSubmitting }: PromptLoggerProps) {
  const [selectedModel, setSelectedModel] = useState('')
  const [note, setNote] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isOutputOpen, setIsOutputOpen] = useState(false)
  const { toast } = useToast()
  const { noteCharacterLimit } = useData()
  
  const outputTokens = useMemo(() => {
    if (!outputText) return 0;
    // A common heuristic for token count is 1 token ~ 4 characters.
    return Math.ceil(outputText.length / 4);
  }, [outputText]);

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

    setIsSubmitting(true)
    try {
      await addPrompt(selectedModel, note, outputTokens > 0 ? outputTokens : null)
      setNote('')
      setOutputText('')
      onPromptLogged?.()
    } catch (error: any) {
      toast({
        title: "Log Failed",
        description: error.message || "Could not save prompt. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid items-start gap-4 px-4 py-2 sm:px-6">
      <div className="grid gap-2">
        <Select onValueChange={setSelectedModel} value={selectedModel} disabled={isSubmitting}>
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
          rows={7}
          maxLength={noteCharacterLimit ?? undefined}
          disabled={isSubmitting}
        />
        <div className={cn(
            "text-right text-xs",
            noteCharacterLimit && note.length >= noteCharacterLimit ? "text-red-500" : "text-muted-foreground"
        )}>
          {note.length.toLocaleString()}
          {noteCharacterLimit ? ` / ${noteCharacterLimit.toLocaleString()}` : ' characters'}
        </div>
      </div>
      <Collapsible open={isOutputOpen} onOpenChange={setIsOutputOpen} className="grid gap-2">
        <div className="flex items-center justify-between -mb-2">
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-sm px-2 -ml-2">
                    <ChevronsUpDown className="h-4 w-4 mr-2" />
                    Add LLM Output (Optional)
                </Button>
            </CollapsibleTrigger>
            {isOutputOpen && (
              <span className="text-xs text-muted-foreground">
                  ~{outputTokens} tokens
              </span>
            )}
        </div>
        <CollapsibleContent className="space-y-2 pt-2">
            <Textarea 
                placeholder="Paste the model's output here to count tokens..."
                value={outputText}
                onChange={(e) => setOutputText(e.target.value)}
                rows={5}
                disabled={isSubmitting}
            />
        </CollapsibleContent>
      </Collapsible>
      <Button type="submit" disabled={isSubmitting || !note || !selectedModel}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Log Prompt
      </Button>
    </form>
  )
}