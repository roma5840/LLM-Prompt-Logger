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
import { Label } from './ui/label'
import { ScrollArea } from './ui/scroll-area'

interface PromptLoggerProps {
  addPrompt: (model: string, note: string, inputTokens: number | null, outputTokens: number | null) => Promise<void>
  models: Model[]
  onPromptLogged?: () => void
  isSubmitting: boolean
  setIsSubmitting: (isSubmitting: boolean) => void
}

export function PromptLogger({ addPrompt, models, onPromptLogged, isSubmitting, setIsSubmitting }: PromptLoggerProps) {
  const [selectedModel, setSelectedModel] = useState('')
  const [note, setNote] = useState('')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isInputOpen, setIsInputOpen] = useState(false)
  const [isOutputOpen, setIsOutputOpen] = useState(false)
  const { toast } = useToast()
  const { noteCharacterLimit } = useData()
  
  // A common heuristic for token count is 1 token ~ 4 characters.
  const tokenHeuristic = (text: string) => Math.ceil(text.length / 4);

  const inputTokens = useMemo(() => tokenHeuristic(inputText), [inputText]);
  const outputTokens = useMemo(() => tokenHeuristic(outputText), [outputText]);

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
      await addPrompt(
        selectedModel, 
        note, 
        inputTokens > 0 ? inputTokens : null,
        outputTokens > 0 ? outputTokens : null
      )
      setNote('')
      setInputText('')
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
      <ScrollArea className="max-h-[calc(80vh-220px)] sm:max-h-96 pr-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Select onValueChange={setSelectedModel} value={selectedModel} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.name} value={model.name}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt-notes">Notes / Tags</Label>
            <Textarea
              id="prompt-notes"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add any notes, tags, or a summary for this log..."
              rows={5}
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

          <Collapsible open={isInputOpen} onOpenChange={setIsInputOpen} className="grid gap-2">
            <div className="flex items-center justify-between -mb-2">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-sm px-2 -ml-2">
                        <ChevronsUpDown className="h-4 w-4 mr-2" />
                        Add LLM Input (for token count)
                    </Button>
                </CollapsibleTrigger>
                {isInputOpen && (
                  <span className="text-xs text-muted-foreground">
                      ~{inputTokens.toLocaleString()} input tokens
                  </span>
                )}
            </div>
            <CollapsibleContent className="space-y-2 pt-2">
                <Textarea 
                    placeholder="Paste the original prompt text here to count input tokens..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={5}
                    disabled={isSubmitting}
                />
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={isOutputOpen} onOpenChange={setIsOutputOpen} className="grid gap-2">
            <div className="flex items-center justify-between -mb-2">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-sm px-2 -ml-2">
                        <ChevronsUpDown className="h-4 w-4 mr-2" />
                        Add LLM Output (for token count)
                    </Button>
                </CollapsibleTrigger>
                {isOutputOpen && (
                  <span className="text-xs text-muted-foreground">
                      ~{outputTokens.toLocaleString()} output tokens
                  </span>
                )}
            </div>
            <CollapsibleContent className="space-y-2 pt-2">
                <Textarea 
                    placeholder="Paste the model's output here to count output tokens..."
                    value={outputText}
                    onChange={(e) => setOutputText(e.target.value)}
                    rows={5}
                    disabled={isSubmitting}
                />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
      <Button type="submit" disabled={isSubmitting || !note || !selectedModel}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Log Prompt
      </Button>
    </form>
  )
}