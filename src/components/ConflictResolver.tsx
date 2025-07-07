// src/components/ConflictResolver.tsx
'use client'

import { useState, useMemo } from 'react'
import { ImportConflict, Resolution, NoteLengthConflict, ResolutionChoice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle as CardTitleUI } from '@/components/ui/card'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'
import { CONVERSATION_TITLE_LIMIT, NOTE_CHAR_LIMIT } from '@/lib/constants'
import { Pencil, Shield, CheckCircle2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ConflictResolverProps {
  isOpen: boolean
  conflicts: ImportConflict[]
  onResolve: (resolutions: Record<string, Resolution>) => void
  onCancel: () => void
  mode: 'import' | 'migration'
}

const titles = {
  import: "Resolve Import Conflicts",
  migration: "Resolve Sync Conflicts"
}

const getConflictDescription = (count: number, mode: 'import' | 'migration') => {
  const start = mode === 'import' 
    ? `Your import file contains ${count} item(s)` 
    : `You have ${count} local item(s)`;
  return `${start} that exceed sync limits (e.g., titles > ${CONVERSATION_TITLE_LIMIT} chars, notes > ${NOTE_CHAR_LIMIT} chars). To proceed, please resolve each conflict below.`
}

const TITLE_DISPLAY_LIMIT = 100;

interface EditConflictModalProps {
  conflict: ImportConflict;
  onSave: (conflict: ImportConflict, content: string) => void;
  onClose: () => void;
}

function EditConflictModal({ conflict, onSave, onClose }: EditConflictModalProps) {
  const isTitleConflict = conflict.type === 'title_length';
  const initialContent = isTitleConflict ? conflict.conversationTitle : (conflict as NoteLengthConflict).turnContent;
  const limit = isTitleConflict ? CONVERSATION_TITLE_LIMIT : NOTE_CHAR_LIMIT;
  const label = isTitleConflict ? 'Title' : 'Note';

  const [content, setContent] = useState(initialContent || '');
  const isUnderLimit = content.length <= limit;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {label} to Fit</DialogTitle>
          <DialogDescription>Reduce the {label.toLowerCase()} content to {limit} characters or less to sync it.</DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={isTitleConflict ? 3 : 12}
            className="text-sm"
          />
          <div className={cn(
            "text-right text-sm mt-2",
            isUnderLimit ? "text-muted-foreground" : "text-destructive font-semibold"
          )}>
            {content.length.toLocaleString()} / {limit.toLocaleString()}
          </div>
        </div>
        <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(conflict, content)} disabled={!isUnderLimit}>
                Save and Sync
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConflictResolver({ isOpen, conflicts, onResolve, onCancel, mode }: ConflictResolverProps) {
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({})
  const [editingConflict, setEditingConflict] = useState<ImportConflict | null>(null)

  const getConflictKey = (conflict: ImportConflict): string => {
    if (conflict.type === 'note_length') {
      return `note-${conflict.turnId}`;
    }
    return `title-${conflict.conversationId}`;
  };

  const { resolvedCount, allResolved } = useMemo(() => {
    const resolvedConversationIds = new Set<number>();
    Object.values(resolutions).forEach(res => {
        if (res.choice === 'keep_local') {
            resolvedConversationIds.add(res.conversationId);
        }
    });

    let count = 0;
    for (const conflict of conflicts) {
        if (resolvedConversationIds.has(conflict.conversationId) || resolutions[getConflictKey(conflict)]) {
            count++;
        }
    }
    return { resolvedCount: count, allResolved: count === conflicts.length };
  }, [resolutions, conflicts]);

  const setResolution = (conflict: ImportConflict, choice: ResolutionChoice, content?: string) => {
    if (choice === 'keep_local') {
      const conversationId = conflict.conversationId;
      const newResolutionsForConvo: Record<string, Resolution> = {};

      conflicts.forEach(c => {
        if (c.conversationId === conversationId) {
          const key = getConflictKey(c);
          newResolutionsForConvo[key] = {
            choice: 'keep_local',
            content: c.type === 'note_length' ? (c as NoteLengthConflict).turnContent : c.conversationTitle,
            conversationId: c.conversationId,
          };
        }
      });

      setResolutions(prev => ({
        ...prev,
        ...newResolutionsForConvo,
      }));
    } else {
      // 'edit' choice
      const conflictKey = getConflictKey(conflict);
      setResolutions(prev => ({
        ...prev,
        [conflictKey]: {
          choice,
          content: content ?? (conflict.type === 'note_length' ? (conflict as NoteLengthConflict).turnContent : conflict.conversationTitle),
          conversationId: conflict.conversationId,
        },
      }));
    }
  };

  const handleComplete = () => {
    onResolve(resolutions);
  }

  const handleEditSave = (conflict: ImportConflict, newContent: string) => {
    setResolution(conflict, 'edit', newContent);
    setEditingConflict(null);
  }

  const handleUndoResolution = (conflict: ImportConflict) => {
    const isConvoKeptLocal = Object.values(resolutions).some(r => r.conversationId === conflict.conversationId && r.choice === 'keep_local');

    if (isConvoKeptLocal) {
        setResolutions(prev => {
            const newResolutions = { ...prev };
            Object.keys(newResolutions).forEach(key => {
                if (newResolutions[key].conversationId === conflict.conversationId) {
                    delete newResolutions[key];
                }
            });
            return newResolutions;
        });
    } else {
        const conflictKey = getConflictKey(conflict);
        setResolutions(prev => {
            const newResolutions = { ...prev };
            delete newResolutions[conflictKey];
            return newResolutions;
        });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">{titles[mode]}</DialogTitle>
            <DialogDescription>
              {getConflictDescription(conflicts.length, mode)}
            </DialogDescription>
          </DialogHeader>
          <TooltipProvider>
            <div className="flex-1 min-h-0 px-6">
              <ScrollArea className="h-full pr-4 -mr-4">
                <div className="space-y-4">
                  {conflicts.map(conflict => {
                    const conflictKey = getConflictKey(conflict);
                    const isTitleConflict = conflict.type === 'title_length';
                    
                    const isConvoKeptLocal = Object.values(resolutions).some(r => r.conversationId === conflict.conversationId && r.choice === 'keep_local');
                    const isResolved = !!resolutions[conflictKey] || isConvoKeptLocal;

                    const titleText = conflict.conversationTitle || '';
                    const isLongTitle = titleText.length > TITLE_DISPLAY_LIMIT;
                    const truncatedTitle = isLongTitle ? `${titleText.substring(0, TITLE_DISPLAY_LIMIT)}...` : titleText;

                    return (
                      <Card key={conflictKey} className={cn(isResolved && "border-green-500/50 bg-green-500/5")}>
                        <CardHeader className="flex flex-row items-center justify-between p-4">
                          <div className="space-y-1 min-w-0">
                            <CardTitleUI className="text-base font-medium break-all">
                              {isTitleConflict ? `Title Conflict: "` : `Note Conflict in: "` }
                              {isLongTitle ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help underline decoration-dashed decoration-from-font">
                                      {truncatedTitle}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-md break-words">{titleText}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                truncatedTitle
                              )}
                              {`"`}
                            </CardTitleUI>
                            <CardDescription className="text-xs">
                              {isTitleConflict
                                ? "The conversation title exceeds the character limit."
                                : `Turn from: ${new Date((conflict as NoteLengthConflict).turnTimestamp).toLocaleString()}`
                              }
                            </CardDescription>
                          </div>
                          <Badge variant="destructive" className="shrink-0 ml-4">
                            {isTitleConflict
                              ? `${conflict.conversationTitle?.length.toLocaleString() ?? 0} chars`
                              : `${(conflict as NoteLengthConflict).turnContent?.length.toLocaleString() ?? 0} chars`
                            }
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          {isResolved ? (
                            <div className="flex items-center justify-between text-green-600">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5" />
                                <p className="font-medium text-sm">
                                  {isConvoKeptLocal
                                    ? 'Resolved: Conversation will be kept on this device only'
                                    : 'Resolved: Will be edited and synced'
                                  }
                                </p>
                              </div>
                              <Button variant="link" size="sm" onClick={() => handleUndoResolution(conflict)}>Undo</Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingConflict(conflict)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit {isTitleConflict ? 'Title' : 'Note'} to Fit
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => setResolution(conflict, 'keep_local')}>
                                <Shield className="mr-2 h-4 w-4" /> Keep Conversation Local
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </TooltipProvider>
          <div className="mt-auto p-6 pt-4 border-t bg-background flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {resolvedCount} of {conflicts.length} resolved.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onCancel}>Cancel {mode === 'import' ? 'Import' : 'Sync'}</Button>
              <Button onClick={handleComplete} disabled={!allResolved}>Complete {mode === 'import' ? 'Import' : 'Sync'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {editingConflict && (
        <EditConflictModal
          conflict={editingConflict}
          onSave={handleEditSave}
          onClose={() => setEditingConflict(null)}
        />
      )}
    </>
  )
}