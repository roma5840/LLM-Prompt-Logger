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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-lg">Log a New Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            Log Prompt
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
