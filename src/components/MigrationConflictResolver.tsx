// src/components/MigrationConflictResolver.tsx
'use client'

import { useState, useMemo, useCallback } from 'react'
import { Prompt } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle as CardTitleUI } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'
import { NOTE_CHAR_LIMIT } from '@/lib/constants'
import { ChevronDown, FileDown, Pencil, Shield, CheckCircle2 } from 'lucide-react'

type Resolution = 'keep_local' | 'edit'

interface MigrationConflictResolverProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  conflicts: Prompt[]
  onResolve: (notesToMigrate: Prompt[], notesToKeepLocal: Prompt[]) => void
  onCancel: () => void
}

export function MigrationConflictResolver({ isOpen, onOpenChange, conflicts, onResolve, onCancel }: MigrationConflictResolverProps) {
  const [resolutions, setResolutions] = useState<Record<number, { choice: Resolution; content: string }>>({})
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)

  const resolvedCount = useMemo(() => Object.keys(resolutions).length, [resolutions])
  const allResolved = useMemo(() => resolvedCount === conflicts.length, [resolvedCount, conflicts.length])

  const setResolution = (id: number, choice: Resolution, content?: string) => {
    setResolutions(prev => ({
      ...prev,
      [id]: { choice, content: content ?? conflicts.find(p => p.id === id)!.note }
    }))
  }

  const handleExport = (prompt: Prompt) => {
    const blob = new Blob([prompt.note], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt-note-${prompt.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setResolution(prompt.id, 'keep_local')
  }

  const handleComplete = () => {
    const notesToMigrate: Prompt[] = []
    const notesToKeepLocal: Prompt[] = []

    conflicts.forEach(p => {
      const res = resolutions[p.id]
      if (!res) return

      if (res.choice === 'keep_local') {
        notesToKeepLocal.push({ ...p, note: res.content })
      } else if (res.choice === 'edit') {
        notesToMigrate.push({ ...p, note: res.content })
      }
    })

    onResolve(notesToMigrate, notesToKeepLocal)
  }

  const handleEditSave = (id: number, newContent: string) => {
    setResolution(id, 'edit', newContent)
    setEditingPrompt(null)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">Resolve Sync Conflicts</DialogTitle>
            <DialogDescription>
              {conflicts.length} of your notes are too long for cloud sync ({NOTE_CHAR_LIMIT} characters max). Please resolve each conflict to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6">
            <ScrollArea className="h-full pr-4 -mr-4">
              <div className="space-y-4">
                {conflicts.map(prompt => (
                  <Card key={prompt.id} className={cn(resolutions[prompt.id] && "border-green-500/50 bg-green-500/5")}>
                    <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="space-y-1">
                        <CardTitleUI className="text-base font-medium">
                          Note from: {new Date(prompt.timestamp).toLocaleDateString()}
                        </CardTitleUI>
                        <CardDescription className="text-xs truncate max-w-xs sm:max-w-md">
                          Model: {prompt.model} • Preview: {prompt.note.substring(0, 50)}...
                        </CardDescription>
                      </div>
                      <Badge variant={resolutions[prompt.id]?.choice === 'edit' ? "default" : "secondary"}>
                        {prompt.note.length.toLocaleString()} / {NOTE_CHAR_LIMIT.toLocaleString()} chars
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {resolutions[prompt.id] ? (
                        <div className="flex items-center justify-between text-green-600">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            <p className="font-medium text-sm">
                              {resolutions[prompt.id].choice === 'edit' ? 'Resolved: Will be edited and synced' : 'Resolved: Will be kept on this device only'}
                            </p>
                          </div>
                          <Button variant="link" size="sm" onClick={() => {
                              const {[prompt.id]: _, ...rest} = resolutions;
                              setResolutions(rest);
                          }}>Undo</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingPrompt(prompt)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit to Fit
                          </Button>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="secondary" size="sm">
                                More Options <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => setResolution(prompt.id, 'keep_local')}>
                                <Shield className="mr-2 h-4 w-4" /> Keep as Local-Only
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleExport(prompt)}>
                                <FileDown className="mr-2 h-4 w-4" /> Export and Keep Local
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              <Button variant="outline" onClick={onCancel}>Cancel Sync</Button>
              <Button onClick={handleComplete} disabled={!allResolved}>Complete Sync</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {editingPrompt && (
        <EditConflictModal
          prompt={editingPrompt}
          onSave={handleEditSave}
          onClose={() => setEditingPrompt(null)}
        />
      )}
    </>
  )
}

function EditConflictModal({ prompt, onSave, onClose }: { prompt: Prompt, onSave: (id: number, content: string) => void, onClose: () => void }) {
  const [content, setContent] = useState(prompt.note)
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
            <Button onClick={() => onSave(prompt.id, content)} disabled={!isUnderLimit}>
                Save and Sync
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}