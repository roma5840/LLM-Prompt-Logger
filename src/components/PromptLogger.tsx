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

interface PromptLoggerProps {
  addPrompt: (model: string, note: string) => void
  models: Model[]
}

export function PromptLogger({ addPrompt, models }: PromptLoggerProps) {
  const [selectedModel, setSelectedModel] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModel || !note) {
      alert('Please select a model and enter a note.')
      return
    }
    addPrompt(selectedModel, note)
    setNote('')
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Log a New Prompt</h2>
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
      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Enter prompt notes or tags..."
        rows={4}
      />
      <Button type="submit" className="w-full">
        Log Prompt
      </Button>
    </form>
  )
}
