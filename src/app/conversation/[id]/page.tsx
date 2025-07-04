// src/app/conversation/[id]/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useData } from '@/hooks/use-data'
import { MainLayout } from '@/components/MainLayout'
import { TurnList } from '@/components/TurnList'
import { TurnLogger } from '@/components/TurnLogger'
import { Conversation, Turn, Model } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function ConversationPage() {
  const router = useRouter()
  const params = useParams()
  const { conversations, models, loading, addTurnToConversation } = useData()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false);

  const convoId = useMemo(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    return id ? parseInt(id, 10) : NaN
  }, [params.id])

  useEffect(() => {
    if (!loading && !isNaN(convoId)) {
      const foundConvo = conversations.find(c => c.id === convoId)
      if (foundConvo) {
        setConversation(foundConvo)
      } else {
        // Handle case where conversation is not found, maybe redirect
        router.push('/')
      }
    }
  }, [convoId, conversations, loading, router])

  if (loading || !conversation) {
    return (
      <MainLayout>
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <main className="flex-1 py-4 md:py-6 lg:py-8 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{conversation.title}</h1>
        </div>

        <TurnList turns={conversation.messages} models={models} />
        
        <Card>
          <CardHeader>
            <CardTitle>Log New Turn</CardTitle>
          </CardHeader>
          <CardContent>
            <TurnLogger
              conversationId={conversation.id}
              models={models}
              addTurn={addTurnToConversation}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
            />
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  )
}