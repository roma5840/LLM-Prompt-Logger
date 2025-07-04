// src/components/PromptList.tsx
'use client'

import { useState, useMemo } from 'react'
import { Prompt, Model } from '@/lib/types'
import { useData } from '@/hooks/use-data'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Textarea } from './ui/textarea'
import { MoreHorizontal, ChevronsUpDown, Trash2, CloudOff } from 'lucide-react'
import { Skeleton } from './ui/skeleton'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Label } from './ui/label'

interface PromptListProps {
  loading: boolean
  history: Prompt[]
  deletePrompt: (id: number) => void
  updatePrompt: (id: number, note: string, inputTokens: number | null, outputTokens: number | null) => void
}

const ITEMS_PER_PAGE = 10;
const NOTE_TRUNCATE_LENGTH = 100;

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

const formatCost = (cost: number) => {
    if (cost < 0.000001 && cost > 0) return "<$0.000001";
    if (cost === 0) return "N/A";
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
};

const tokenHeuristic = (text: string) => Math.ceil(text.length / 4);

export function PromptList({
  loading,
  history,
  deletePrompt,
  updatePrompt,
}: PromptListProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  
  const { models, noteCharacterLimit } = useData();

  const modelCostMap = useMemo(() => {
    const map = new Map<string, { inputCost: number; outputCost: number }>();
    models.forEach(model => {
      map.set(model.name, { inputCost: model.inputCost, outputCost: model.outputCost });
    });
    return map;
  }, [models]);

  // State for the edit dialog
  const [editedNote, setEditedNote] = useState('')
  const [editedInputTokens, setEditedInputTokens] = useState<number | null>(null)
  const [editedOutputTokens, setEditedOutputTokens] = useState<number | null>(null)
  
  const [isInputOpen, setIsInputOpen] = useState(false)
  const [isOutputOpen, setIsOutputOpen] = useState(false)
  
  const [inputTextForRecalc, setInputTextForRecalc] = useState('')
  const [outputTextForRecalc, setOutputTextForRecalc] = useState('')

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
  
  const recalculatedInputTokens = useMemo(() => {
    if (!inputTextForRecalc) return 0;
    return tokenHeuristic(inputTextForRecalc);
  }, [inputTextForRecalc]);

  const recalculatedOutputTokens = useMemo(() => {
    if (!outputTextForRecalc) return 0;
    return tokenHeuristic(outputTextForRecalc);
  }, [outputTextForRecalc]);

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setEditedNote(prompt.note)
    setEditedInputTokens(prompt.input_tokens)
    setEditedOutputTokens(prompt.output_tokens)
    setInputTextForRecalc('')
    setOutputTextForRecalc('')
    setIsInputOpen(false)
    setIsOutputOpen(false)
  }

  const handleSaveEdit = () => {
    if (editingPrompt) {
        updatePrompt(editingPrompt.id, editedNote, editedInputTokens, editedOutputTokens)
        setEditingPrompt(null)
    }
  }

  const handleApplyRecalculatedInputTokens = () => {
    const newTokens = recalculatedInputTokens > 0 ? recalculatedInputTokens : null;
    if (newTokens !== editedInputTokens) {
        setEditedInputTokens(newTokens);
    }
    setInputTextForRecalc('');
  };
  
  const handleApplyRecalculatedOutputTokens = () => {
    const newTokens = recalculatedOutputTokens > 0 ? recalculatedOutputTokens : null;
    if (newTokens !== editedOutputTokens) {
        setEditedOutputTokens(newTokens);
    }
    setOutputTextForRecalc('');
  };
  
  const isSaveDisabled = useMemo(() => {
      if (!editingPrompt) return true;
      if (!editedNote) return true; // Notes are now mandatory
      if (editingPrompt.is_local_only) return false;
      if (noteCharacterLimit && editedNote.length > noteCharacterLimit) return true;
      return false;
  }, [editedNote, editingPrompt, noteCharacterLimit]);

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
              <TableHead>Note / Tags</TableHead>
              <TableHead className="whitespace-nowrap text-center">Tokens (In/Out)</TableHead>
              <TableHead className="whitespace-nowrap text-center">Cost</TableHead>
              <TableHead className="md:whitespace-nowrap">Timestamp</TableHead>
              <TableHead className="w-[50px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedHistory.map(prompt => {
              const costs = modelCostMap.get(prompt.model);
              const cost = costs && (costs.inputCost > 0 || costs.outputCost > 0)
                ? ((prompt.input_tokens || 0) / 1_000_000 * costs.inputCost) + ((prompt.output_tokens || 0) / 1_000_000 * costs.outputCost)
                : 0;

              return (
              <TableRow key={prompt.id}>
                <TableCell className="font-medium md:whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>{prompt.model}</span>
                    {prompt.is_local_only && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <CloudOff className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This note is only on this device.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
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
                          <DialogTitle>Full Note</DialogTitle>
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
                  {(prompt.input_tokens?.toLocaleString() ?? 'N/A')}
                  <span className="text-muted-foreground mx-1">/</span> 
                  {prompt.output_tokens?.toLocaleString() ?? 'N/A'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-center font-mono text-sm">
                    {formatCost(cost)}
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
                       <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Edit Prompt Log</DialogTitle>
                        </DialogHeader>
                        <div className="my-4 grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="edit-note">Note / Tags</Label>
                            <Textarea
                              id="edit-note"
                              value={editedNote}
                              onChange={e => setEditedNote(e.target.value)}
                              rows={4}
                              maxLength={editingPrompt.is_local_only ? undefined : noteCharacterLimit ?? undefined}
                              placeholder="Enter prompt notes or tags..."
                            />
                            <div className={cn(
                                "text-right text-xs mt-1",
                                !editingPrompt.is_local_only && noteCharacterLimit && editedNote.length > noteCharacterLimit ? "text-red-500" : "text-muted-foreground"
                            )}>
                              {editedNote.length.toLocaleString()}
                              {noteCharacterLimit && !editingPrompt.is_local_only ? ` / ${noteCharacterLimit.toLocaleString()}` : ' characters'}
                            </div>
                          </div>
                          <Collapsible open={isInputOpen} onOpenChange={setIsInputOpen} className="grid gap-2">
                            <div className="flex items-center justify-between -mb-2">
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-sm px-2 -ml-2">
                                        <ChevronsUpDown className="h-4 w-4 mr-2" />
                                        Recalculate Input Tokens
                                    </Button>
                                </CollapsibleTrigger>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono text-muted-foreground">
                                      {editedInputTokens?.toLocaleString() ?? 'N/A'}
                                  </span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditedInputTokens(null)}>
                                    <Trash2 className="h-4 w-4 text-destructive/70" />
                                  </Button>
                                </div>
                            </div>
                            <CollapsibleContent className="space-y-2 pt-2">
                                <Textarea 
                                    placeholder="Paste original prompt here to recalculate tokens..."
                                    value={inputTextForRecalc}
                                    onChange={(e) => setInputTextForRecalc(e.target.value)}
                                    rows={5}
                                />
                                <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
                                    <p>Recalculated tokens: ~{recalculatedInputTokens.toLocaleString()}</p>
                                    {inputTextForRecalc && (
                                        <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs"
                                            onClick={handleApplyRecalculatedInputTokens}
                                        >
                                            Apply
                                        </Button>
                                    )}
                                </div>
                            </CollapsibleContent>
                          </Collapsible>
                          <Collapsible open={isOutputOpen} onOpenChange={setIsOutputOpen} className="grid gap-2">
                            <div className="flex items-center justify-between -mb-2">
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-sm px-2 -ml-2">
                                        <ChevronsUpDown className="h-4 w-4 mr-2" />
                                        Recalculate Output Tokens
                                    </Button>
                                </CollapsibleTrigger>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono text-muted-foreground">
                                      {editedOutputTokens?.toLocaleString() ?? 'N/A'}
                                  </span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditedOutputTokens(null)}>
                                    <Trash2 className="h-4 w-4 text-destructive/70" />
                                  </Button>
                                </div>
                            </div>
                            <CollapsibleContent className="space-y-2 pt-2">
                                <Textarea 
                                    placeholder="Paste model output here to recalculate tokens..."
                                    value={outputTextForRecalc}
                                    onChange={(e) => setOutputTextForRecalc(e.target.value)}
                                    rows={5}
                                />
                                <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground">
                                    <p>Recalculated tokens: ~{recalculatedOutputTokens.toLocaleString()}</p>
                                    {outputTextForRecalc && (
                                        <Button
                                            type="button"
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs"
                                            onClick={handleApplyRecalculatedOutputTokens}
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
                            <Button onClick={handleSaveEdit} disabled={isSaveDisabled}>Save</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    )}
                  </Dialog>
                </TableCell>
              </TableRow>
              )
            })}
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