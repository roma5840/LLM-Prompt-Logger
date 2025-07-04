// src/components/ConflictResolver.tsx
'use client'

import { useState, useMemo } from 'react'
import { ImportConflict } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle as CardTitleUI } from '@/components/ui/card'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'
import { NOTE_CHAR_LIMIT } from '@/lib/constants'
import { Pencil, Shield, CheckCircle2 } from 'lucide-react'

type ResolutionChoice = 'edit' | 'keep_local'
export interface Resolution {
  choice: ResolutionChoice;
  content: string;
  conversationId: number;
}

interface ConflictResolverProps {
  isOpen: boolean
  conflicts: ImportConflict[]
  onResolve: (resolutions: Record<number, Resolution>) => void
  onCancel: () => void
  mode: 'import' | 'migration'
}

const titles = {
  import: "Resolve Import Conflicts",
  migration: "Resolve Sync Conflicts"
}

const descriptions = {
  import: `Your import file contains ${'COUNT'} turn(s) with notes longer than the sync limit of ${NOTE_CHAR_LIMIT} characters. To proceed, please resolve each conflict below.`,
  migration: `You have ${'COUNT'} local turn(s) with notes longer than the sync limit of ${NOTE_CHAR_LIMIT} characters. To enable cloud sync, please resolve each conflict below.`
}

function EditConflictModal({ conflict, onSave, onClose }: { conflict: ImportConflict, onSave: (conflict: ImportConflict, content: string) => void, onClose: () => void }) {
  const [content, setContent] = useState(conflict.turnContent)
  const isUnderLimit = content.length <= NOTE_CHAR_LIMIT

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Note to Fit</DialogTitle>
          <DialogDescription>Reduce the note content to {NOTE_CHAR_LIMIT} characters or less to sync it.</DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={12}
            className="text-xs"
          />
          <div className={cn(
            "text-right text-sm mt-2",
            isUnderLimit ? "text-muted-foreground" : "text-destructive font-semibold"
          )}>
            {content.length.toLocaleString()} / {NOTE_CHAR_LIMIT.toLocaleString()}
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
  )
}

export function ConflictResolver({ isOpen, conflicts, onResolve, onCancel, mode }: ConflictResolverProps) {
  const [resolutions, setResolutions] = useState<Record<number, Resolution>>({})
  const [editingConflict, setEditingConflict] = useState<ImportConflict | null>(null)

  const resolvedCount = useMemo(() => Object.keys(resolutions).length, [resolutions])
  const allResolved = useMemo(() => resolvedCount === conflicts.length, [resolvedCount, conflicts.length])

  const setResolution = (conflict: ImportConflict, choice: ResolutionChoice, content?: string) => {
    if (choice === 'keep_local') {
      const conversationId = conflict.conversationId;
      const newResolutionsForConvo: Record<number, Resolution> = {};

      conflicts.forEach(c => {
        if (c.conversationId === conversationId) {
          newResolutionsForConvo[c.turnId] = {
            choice: 'keep_local',
            content: c.turnContent,
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
      setResolutions(prev => ({
        ...prev,
        [conflict.turnId]: {
          choice,
          content: content ?? conflict.turnContent,
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
    const conversationIdToUndo = conflict.conversationId;
    
    const turnIdsToUndo = new Set(
      conflicts
        .filter(c => c.conversationId === conversationIdToUndo)
        .map(c => c.turnId)
    );

    setResolutions(prev => {
        const newResolutions = { ...prev };
        for (const turnId in newResolutions) {
            if (turnIdsToUndo.has(Number(turnId))) {
                delete newResolutions[turnId];
            }
        }
        return newResolutions;
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">{titles[mode]}</DialogTitle>
            <DialogDescription>
              {descriptions[mode].replace('COUNT', String(conflicts.length))}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6">
            <ScrollArea className="h-full pr-4 -mr-4">
              <div className="space-y-4">
                {conflicts.map(conflict => (
                  <Card key={conflict.turnId} className={cn(resolutions[conflict.turnId] && "border-green-500/50 bg-green-500/5")}>
                    <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="space-y-1">
                        <CardTitleUI className="text-base font-medium">
                          In Conversation: "{conflict.conversationTitle}"
                        </CardTitleUI>
                        <CardDescription className="text-xs">
                          Turn from: {new Date(conflict.turnTimestamp).toLocaleString()}
                        </CardDescription>
                      </div>
                      <Badge variant="destructive">
                        {conflict.turnContent.length.toLocaleString()} characters
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {resolutions[conflict.turnId] ? (
                        <div className="flex items-center justify-between text-green-600">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            <p className="font-medium text-sm">
                              {resolutions[conflict.turnId].choice === 'edit' ? 'Resolved: Will be edited and synced' : 'Resolved: Conversation will be kept on this device only'}
                            </p>
                          </div>
                          <Button variant="link" size="sm" onClick={() => handleUndoResolution(conflict)}>Undo</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingConflict(conflict)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Note to Fit
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setResolution(conflict, 'keep_local')}>
                            <Shield className="mr-2 h-4 w-4" /> Keep Conversation Local
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
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