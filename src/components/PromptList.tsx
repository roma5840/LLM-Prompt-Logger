// src/components/PromptList.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { MoreHorizontal, ChevronsUpDown, Trash2 } from 'lucide-react'
import { Skeleton } from './ui/skeleton'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'

interface PromptListProps {
  loading: boolean
  history: Prompt[]
  deletePrompt: (id: number) => void
  updatePrompt: (id: number, note: string, outputTokens: number | null) => void
}

const ITEMS_PER_PAGE = 10
const NOTE_TRUNCATE_LENGTH = 100;
const NOTE_MAX_LENGTH = 1500;

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
  updatePrompt,
}: PromptListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  
  // State for the edit dialog
  const [editedNote, setEditedNote] = useState('')
  const [editedTokens, setEditedTokens] = useState<number | null>(null)
  const [isOutputOpen, setIsOutputOpen] = useState(false)
  const [outputText, setOutputText] = useState('')

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

  const calculatedTokens = useMemo(() => {
    if (!outputText) return 0;
    // A common heuristic for token count is 1 token ~ 4 characters.
    return Math.ceil(outputText.length / 4);
  }, [outputText]);

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setEditedNote(prompt.note)
    setEditedTokens(prompt.output_tokens)
    setOutputText('')
    setIsOutputOpen(false)
  }

  const handleSaveEdit = () => {
    if (editingPrompt) {
      updatePrompt(editingPrompt.id, editedNote, editedTokens)
      setEditingPrompt(null)
    }
  }

  const handleApplyRecalculatedTokens = () => {
    const newTokens = calculatedTokens > 0 ? calculatedTokens : null;
    if (newTokens !== editedTokens) {
        setEditedTokens(newTokens);
    }
    setOutputText('');
  };

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
              <TableHead className="md:whitespace-nowrap">Model</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="whitespace-nowrap text-center">Output Tokens</TableHead>
              <TableHead className="md:whitespace-nowrap">Timestamp</TableHead>
              <TableHead className="w-[50px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedHistory.map(prompt => (
              <TableRow key={prompt.id}>
                <TableCell className="font-medium md:whitespace-nowrap">{prompt.model}</TableCell>
                <TableCell className="text-muted-foreground max-w-[150px] sm:max-w-sm break-words">
                  {prompt.note && prompt.note.length > NOTE_TRUNCATE_LENGTH ? (
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
                <TableCell className="whitespace-nowrap text-center font-mono text-sm">
                  {prompt.output_tokens?.toLocaleString() ?? 'N/A'}
                </TableCell>
                <TableCell className="md:whitespace-nowrap">
                  {new Date(prompt.timestamp).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Dialog onOpenChange={(open) => !open && setEditingPrompt(null)}>
                    <DropdownMenu modal={false}>
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
                          <DialogTitle>Edit Prompt</DialogTitle>
                        </DialogHeader>
                        <div className="my-4 grid gap-4">
                          <div className="grid gap-2">
                            <Textarea
                              value={editedNote}
                              onChange={e => setEditedNote(e.target.value)}
                              rows={7}
                              maxLength={NOTE_MAX_LENGTH}
                              placeholder="Enter prompt notes or tags..."
                            />
                            <div className={cn(
                                "text-right text-xs mt-1",
                                editedNote.length >= NOTE_MAX_LENGTH ? "text-red-500" : "text-muted-foreground"
                            )}>
                              {editedNote.length} / {NOTE_MAX_LENGTH}
                            </div>
                          </div>
                          <Collapsible open={isOutputOpen} onOpenChange={setIsOutputOpen} className="grid gap-2">
                            <div className="flex items-center justify-between -mb-2">
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-sm px-2 -ml-2">
                                        <ChevronsUpDown className="h-4 w-4 mr-2" />
                                        Edit LLM Output Tokens
                                    </Button>
                                </CollapsibleTrigger>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono text-muted-foreground">
                                      {editedTokens?.toLocaleString() ?? 'N/A'}
                                  </span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditedTokens(null)}>
                                    <Trash2 className="h-4 w-4 text-destructive/70" />
                                  </Button>
                                </div>
                            </div>
                            <CollapsibleContent className="space-y-2 pt-2">
                                <Textarea 
                                    placeholder="Paste new model output here to recalculate tokens..."
                                    value={outputText}
                                    onChange={(e) => setOutputText(e.target.value)}
                                    rows={5}
                                />
                                <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
                                    <p>Recalculated tokens: ~{calculatedTokens.toLocaleString()}</p>
                                    {outputText && (
                                        <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs"
                                            onClick={handleApplyRecalculatedTokens}
                                        >
                                            Apply
                                        </Button>
                                    )}
                                </div>
                            </CollapsibleContent>
                          </Collapsible>
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