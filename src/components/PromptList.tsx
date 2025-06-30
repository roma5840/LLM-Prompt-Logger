// src/components/PromptList.tsx
'use client'

import { useState } from 'react'
import { Prompt } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog'
import { Textarea } from './ui/textarea'
import { MoreHorizontal } from 'lucide-react'
import { Skeleton } from './ui/skeleton'

interface PromptListProps {
  loading: boolean
  history: Prompt[]
  deletePrompt: (id: number) => void
  updatePromptNote: (id: number, note: string) => void
}

const ITEMS_PER_PAGE = 10

export function PromptList({
  loading,
  history,
  deletePrompt,
  updatePromptNote,
}: PromptListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [editedNote, setEditedNote] = useState('')

  const paginatedHistory = history.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE)

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setEditedNote(prompt.note)
  }

  const handleSaveEdit = () => {
    if (editingPrompt) {
      updatePromptNote(editingPrompt.id, editedNote)
      setEditingPrompt(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <p className="text-center text-sm text-muted-foreground">Loading history...</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No prompts found.</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or logging a new prompt.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead className="w-[50px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedHistory.map(prompt => (
              <TableRow key={prompt.id}>
                <TableCell className="font-medium">{prompt.model}</TableCell>
                <TableCell className="text-muted-foreground">{prompt.note}</TableCell>
                <TableCell>
                  {new Date(prompt.timestamp).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Dialog onOpenChange={(open) => !open && setEditingPrompt(null)}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DialogTrigger asChild>
                          <DropdownMenuItem onSelect={() => handleEdit(prompt)}>
                            Edit
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DropdownMenuItem
                          onClick={() => deletePrompt(prompt.id)}
                          className="text-red-600 focus:text-red-500 focus:bg-red-500/10"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {editingPrompt && editingPrompt.id === prompt.id && (
                       <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Prompt Note</DialogTitle>
                        </DialogHeader>
                        <Textarea
                          value={editedNote}
                          onChange={e => setEditedNote(e.target.value)}
                          rows={5}
                          className="my-4"
                        />
                        <DialogFooter>
                          <DialogClose asChild>
                             <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button onClick={handleSaveEdit}>Save</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    )}
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}