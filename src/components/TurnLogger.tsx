// src/components/TurnLogger.tsx
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
import { Input } from '@/components/ui/input'
import { Model, Turn } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useData } from '@/hooks/use-data'
import { cn } from '@/lib/utils'
import { Loader2, ChevronsUpDown, ArrowRightLeft } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Label } from './ui/label'
import { MANUAL_TOKEN_LIMIT } from '@/lib/constants'

interface TurnLoggerProps {
  conversationId: number
  addTurn: (conversationId: number, turn: Omit<Turn, 'id' | 'conversation_id' | 'timestamp'>) => Promise<void>
  models: Model[]
  isSubmitting: boolean
  setIsSubmitting: (isSubmitting: boolean) => void
}

export function TurnLogger({ conversationId, addTurn, models, isSubmitting, setIsSubmitting }: TurnLoggerProps) {
  const [selectedModel, setSelectedModel] = useState('')
  const [note, setNote] = useState('')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [isInputOpen, setIsInputOpen] = useState(false)
  const [isOutputOpen, setIsOutputOpen] = useState(false)

  const [inputMode, setInputMode] = useState<'auto' | 'manual'>('auto');
  const [outputMode, setOutputMode] = useState<'auto' | 'manual'>('auto');
  const [manualInputTokens, setManualInputTokens] = useState('');
  const [manualOutputTokens, setManualOutputTokens] = useState('');

  const { toast } = useToast()
  const { noteCharacterLimit } = useData()
  
  const tokenHeuristic = (text: string) => Math.ceil(text.length / 4);

  const inputTokens = useMemo(() => {
    if (inputMode === 'manual') {
        return parseInt(manualInputTokens, 10) || 0;
    }
    return tokenHeuristic(inputText);
  }, [inputText, inputMode, manualInputTokens]);

  const outputTokens = useMemo(() => {
      if (outputMode === 'manual') {
          return parseInt(manualOutputTokens, 10) || 0;
      }
      return tokenHeuristic(outputText);
  }, [outputText, outputMode, manualOutputTokens]);

  const handleManualTokenChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const sanitizedValue = value.replace(/\D/g, '');
    if (sanitizedValue === '') {
      setter('');
      return;
    }
    const numValue = parseInt(sanitizedValue, 10);
    if (numValue > MANUAL_TOKEN_LIMIT) {
      setter(String(MANUAL_TOKEN_LIMIT));
    } else {
      setter(sanitizedValue);
    }
  };

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
      const newTurn = {
        model: selectedModel,
        role: 'assistant' as const,
        content: note,
        input_tokens: inputTokens > 0 ? inputTokens : null,
        output_tokens: outputTokens > 0 ? outputTokens : null
      }
      await addTurn(conversationId, newTurn)
      
      // Reset form
      setNote('')
      setInputText('')
      setOutputText('')
      setIsInputOpen(false)
      setIsOutputOpen(false)
      setManualInputTokens('');
      setManualOutputTokens('');
      setInputMode('auto');
      setOutputMode('auto');
      // Don't reset model for convenience
    } catch (error: any) {
      toast({
        title: "Log Failed",
        description: error.message || "Could not save turn. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleModeChange = (
    mode: 'input' | 'output',
    setMode: React.Dispatch<React.SetStateAction<'auto' | 'manual'>>,
    setText: React.Dispatch<React.SetStateAction<string>>,
    setManualTokens: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const currentMode = mode === 'input' ? inputMode : outputMode;
    const nextMode = currentMode === 'auto' ? 'manual' : 'auto';
    if (nextMode === 'manual') {
      setText('');
    } else {
      setManualTokens('');
    }
    setMode(nextMode);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
            <Label htmlFor="turn-model">Model</Label>
            <Select onValueChange={setSelectedModel} value={selectedModel} disabled={isSubmitting}>
            <SelectTrigger id="turn-model">
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
      </div>
      <div className="grid gap-2">
        <Label htmlFor="prompt-notes">Note / Summary</Label>
        <Textarea
          id="prompt-notes"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add any notes, tags, or a summary for this turn..."
          rows={4}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {inputMode === 'auto' ? '~' : ''}{inputTokens.toLocaleString()} input tokens
                  </span>
                )}
            </div>
            <CollapsibleContent className="space-y-2 pt-2">
                <div className="flex justify-end -mt-1 -mb-1">
                    <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-auto py-1 px-2"
                        onClick={() => handleModeChange('input', setInputMode, setInputText, setManualInputTokens)}
                    >
                        <ArrowRightLeft className="h-3 w-3 mr-1" />
                        {inputMode === 'auto' ? 'Enter Manually' : 'Estimate from Text'}
                    </Button>
                </div>
                {inputMode === 'auto' ? (
                    <Textarea 
                        placeholder="Paste the original prompt text here..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        rows={5}
                        disabled={isSubmitting}
                    />
                ) : (
                    <Input
                        type="number"
                        placeholder="e.g. 1234"
                        value={manualInputTokens}
                        onChange={(e) => handleManualTokenChange(e.target.value, setManualInputTokens)}
                        disabled={isSubmitting}
                        min="0"
                    />
                )}
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
                        {outputMode === 'auto' ? '~' : ''}{outputTokens.toLocaleString()} output tokens
                    </span>
                )}
            </div>
            <CollapsibleContent className="space-y-2 pt-2">
                <div className="flex justify-end -mt-1 -mb-1">
                    <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-auto py-1 px-2"
                        onClick={() => handleModeChange('output', setOutputMode, setOutputText, setManualOutputTokens)}
                    >
                        <ArrowRightLeft className="h-3 w-3 mr-1" />
                        {outputMode === 'auto' ? 'Enter Manually' : 'Estimate from Text'}
                    </Button>
                </div>
                {outputMode === 'auto' ? (
                    <Textarea 
                        placeholder="Paste the model's output here..."
                        value={outputText}
                        onChange={(e) => setOutputText(e.target.value)}
                        rows={5}
                        disabled={isSubmitting}
                    />
                ) : (
                    <Input
                        type="number"
                        placeholder="e.g. 5678"
                        value={manualOutputTokens}
                        onChange={(e) => handleManualTokenChange(e.target.value, setManualOutputTokens)}
                        disabled={isSubmitting}
                        min="0"
                    />
                )}
            </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !note || !selectedModel} className="w-full md:w-auto">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Turn
        </Button>
      </div>
    </form>
  )
}