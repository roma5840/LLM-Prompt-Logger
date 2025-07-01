// src/components/PromptList.tsx
'use client'

import { useState, useMemo } from 'react'
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
import { cn } from '@/lib/utils'

interface PromptListProps {
  loading: boolean
  history: Prompt[]
  deletePrompt: (id: number) => void
  updatePromptNote: (id: number, note: string) => void
}

const ITEMS_PER_PAGE = 10
const NOTE_TRUNCATE_LENGTH = 100;
const NOTE_MAX_LENGTH = 500;

const DOTS = '...';

const usePagination = ({
  totalCount,
  pageSize,
  siblingCount = 1,
  currentPage,
}: { totalCount: number, pageSize: number, siblingCount?: number, currentPage: number }) => {
  const paginationRange = useMemo(() => {
    const totalPageCount = Math.ceil(totalCount / pageSize);

    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPageCount) {
      return Array.from({ length: totalPageCount }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(
      currentPage + siblingCount,
      totalPageCount
    );

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPageCount;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);

      return [...leftRange, DOTS, totalPageCount];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPageCount - rightItemCount + i + 1);
      return [firstPageIndex, DOTS, ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
      return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
    }
  }, [totalCount, pageSize, siblingCount, currentPage]);

  return paginationRange;
};


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

  const paginationRange = usePagination({
    currentPage,
    totalCount: history.length,
    pageSize: ITEMS_PER_PAGE,
  });

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
                <TableCell className="text-muted-foreground max-w-sm break-words">
                  {prompt.note.length > NOTE_TRUNCATE_LENGTH ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <span className="cursor-pointer hover:underline">
                          {`${prompt.note.substring(0, NOTE_TRUNCATE_LENGTH)}...`}
                        </span>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                          <DialogTitle>Full Prompt Note</DialogTitle>
                        </DialogHeader>
                        <div className="my-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-muted/50 p-4 text-sm">
                          {prompt.note}
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    prompt.note
                  )}
                </TableCell>
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
                        <div className="my-4">
                          <Textarea
                            value={editedNote}
                            onChange={e => setEditedNote(e.target.value)}
                            rows={5}
                            maxLength={NOTE_MAX_LENGTH}
                          />
                          <div className={cn(
                              "text-right text-xs mt-1",
                              editedNote.length >= NOTE_MAX_LENGTH ? "text-red-500" : "text-muted-foreground"
                          )}>
                            {editedNote.length} / {NOTE_MAX_LENGTH}
                          </div>
                        </div>
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
        <div className="flex justify-center items-center space-x-1 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          {paginationRange?.map((pageNumber, index) => {
            if (pageNumber === DOTS) {
              return (
                <span key={`dots-${index}`} className="flex h-9 w-9 items-center justify-center text-sm">
                  …
                </span>
              );
            }
            return (
              <Button
                key={pageNumber}
                variant={currentPage === pageNumber ? 'default' : 'ghost'}
                size="sm"
                className="h-9 w-9"
                onClick={() => setCurrentPage(pageNumber as number)}
              >
                {pageNumber}
              </Button>
            );
          })}
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