// src/components/ConversationList.tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link' // Import Link
import { Conversation, Model } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MoreHorizontal, Trash2, CloudOff, MessageSquare, Edit } from 'lucide-react'
import { Skeleton } from './ui/skeleton'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle as CardTitleUI } from './ui/card'
import { Input } from './ui/input'

interface ConversationListProps {
  loading: boolean
  conversations: Conversation[]
  deleteConversation: (id: number) => void
  updateConversationTitle: (id: number, newTitle: string) => void
  models: Model[]
}

const ITEMS_PER_PAGE = 9;

const formatCost = (cost: number) => {
    if (cost < 0.000001 && cost > 0) return "<$0.000001";
    if (cost === 0) return "$0.00";
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
};

export function ConversationList({
  loading,
  conversations,
  deleteConversation,
  updateConversationTitle,
  models
}: ConversationListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [editingConversationId, setEditingConversationId] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState("")

  const modelCostMap = useMemo(() => {
    const map = new Map<string, { inputCost: number; outputCost: number }>();
    models.forEach(model => {
      map.set(model.name, { inputCost: model.inputCost, outputCost: model.outputCost });
    });
    return map;
  }, [models]);

  const paginatedConversations = conversations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totalPages = Math.ceil(conversations.length / ITEMS_PER_PAGE)

  const calculateCost = (convo: Conversation) => {
    // This is a simplified total cost for the list view.
    // The detailed, context-aware cost is on the conversation page.
    return convo.messages.reduce((total, turn) => {
        const costs = modelCostMap.get(turn.model);
        if (!costs) return total;
        
        const inputCost = (turn.input_tokens || 0) / 1_000_000 * costs.inputCost;
        const outputCost = (turn.output_tokens || 0) / 1_000_000 * costs.outputCost;
        return total + inputCost + outputCost;
    }, 0);
  }

  const handleStartEdit = (e: React.MouseEvent, convo: Conversation) => {
    e.preventDefault(); // Prevent link navigation
    setEditingConversationId(convo.id)
    setNewTitle(convo.title)
  }

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link navigation
    if (editingConversationId && newTitle) {
      updateConversationTitle(editingConversationId, newTitle)
      setEditingConversationId(null)
      setNewTitle("")
    }
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault(); // Prevent link navigation
    deleteConversation(id);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg">
        <p className="text-muted-foreground">No conversations found.</p>
        <p className="text-sm text-muted-foreground">Try starting a new conversation.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedConversations.map(convo => (
          <Link key={convo.id} href={`/conversation/${convo.id}`} className="flex">
            <Card className="flex flex-col w-full hover:border-primary/50 transition-colors">
              <CardHeader className="flex-row items-start gap-4 space-y-0">
                <div className="flex-1 space-y-1">
                  {editingConversationId === convo.id ? (
                    <div className="flex gap-2">
                      <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onClick={(e) => e.preventDefault()} onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(e)} />
                      <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                    </div>
                  ) : (
                    <CardTitleUI className="line-clamp-2">{convo.title}</CardTitleUI>
                  )}
                  <CardDescription>
                    Updated: {new Date(convo.updated_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.preventDefault()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={(e) => handleStartEdit(e, convo)}>
                      <Edit className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => handleDelete(e, convo.id)}
                      className="text-red-600 focus:text-red-500 focus:bg-red-500/10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow flex">
                <div className="text-sm text-muted-foreground flex-1 line-clamp-3">
                  {convo.messages[convo.messages.length - 1]?.content || "No turns yet."}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between text-xs text-muted-foreground pt-4">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> {convo.messages.length} turns
                </div>
                <div className="flex items-center gap-1">
                  {convo.is_local_only && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <CloudOff className="h-4 w-4" onClick={(e) => e.preventDefault()} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This conversation is only on this device.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <span>Total Cost: {formatCost(calculateCost(convo))}</span>
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}