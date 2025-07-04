// src/components/ConversationStarter.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Model, Message } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { useData } from '@/hooks/use-data'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { Label } from './ui/label'
import { ScrollArea } from './ui/scroll-area'
import { Input } from './ui/input'

interface ConversationStarterProps {
  createConversation: (title: string, firstMessage: Omit<Message, 'id' | 'conversation_id' | 'timestamp'>) => Promise<void>
  models: Model[]
  onConversationStarted?: () => void
  isSubmitting: boolean
  setIsSubmitting: (isSubmitting: boolean) => void
}

export function ConversationStarter({ createConversation, models, onConversationStarted, isSubmitting, setIsSubmitting }: ConversationStarterProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const { toast } = useToast()
  const { noteCharacterLimit } = useData()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and the first message.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const firstMessage = {
        role: 'user' as const,
        content: content,
        input_tokens: null, // Tokens are calculated on the assistant response
        output_tokens: null,
      };

      await createConversation(title, firstMessage);
      setTitle('')
      setContent('')
      onConversationStarted?.()
    } catch (error: any) {
      toast({
        title: "Failed to Start Conversation",
        description: error.message || "Could not save conversation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="contents">
      <ScrollArea className="max-h-[calc(80vh-250px)] sm:max-h-[420px] -mx-6 px-6">
        <div className="grid gap-4 pt-2 pb-4">
          <div className="grid gap-2">
            <Label htmlFor="convo-title">Conversation Title</Label>
            <Input
              id="convo-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., 'Brainstorming session for Project X'"
              disabled={isSubmitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="first-message">First Message (User)</Label>
            <Textarea
              id="first-message"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Enter the first user prompt or message..."
              rows={8}
              maxLength={noteCharacterLimit ?? undefined}
              disabled={isSubmitting}
            />
            <div className={cn(
                "text-right text-xs",
                noteCharacterLimit && content.length >= noteCharacterLimit ? "text-red-500" : "text-muted-foreground"
            )}>
              {content.length.toLocaleString()}
              {noteCharacterLimit ? ` / ${noteCharacterLimit.toLocaleString()}` : ' characters'}
            </div>
          </div>
        </div>
      </ScrollArea>
      <div className="-mx-6 -mb-6 px-6 pt-4 pb-6 border-t">
        <Button type="submit" disabled={isSubmitting || !title || !content} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Start Conversation
        </Button>
      </div>
    </form>
  )
}
