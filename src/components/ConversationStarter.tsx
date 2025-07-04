// src/components/ConversationStarter.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Conversation } from '@/lib/types'

interface ConversationStarterProps {
  createConversation: (title: string) => Promise<number | undefined>
  onConversationStarted?: () => void
  isSubmitting: boolean
  setIsSubmitting: (isSubmitting: boolean) => void
}

export function ConversationStarter({ createConversation, onConversationStarted, isSubmitting, setIsSubmitting }: ConversationStarterProps) {
  const [title, setTitle] = useState('')
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) {
      toast({
        title: "Missing Information",
        description: "Please provide a title for the conversation.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const newConversationId = await createConversation(title);
      
      setTitle('')
      onConversationStarted?.()
      
      if (newConversationId) {
        router.push(`/conversation/${newConversationId}`)
      }

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
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
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
        <div className="pt-2">
            <Button type="submit" disabled={isSubmitting || !title} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create and Open
            </Button>
        </div>
    </form>
  )
}