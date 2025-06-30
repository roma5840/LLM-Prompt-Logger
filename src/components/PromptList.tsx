'use client'

import { useState } from 'react'
import { Prompt } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from './ui/textarea'

interface PromptListProps {
  loading: boolean
  history: Prompt[]
  deletePrompt: (id: number) => void
  updatePromptNote: (id:number, note: string) => void
}

const ITEMS_PER_PAGE = 10

export function PromptList({ loading, history, deletePrompt, updatePromptNote }: PromptListProps) {
  const [filter, setFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [editedNote, setEditedNote] = useState('')

  const filteredHistory = history.filter(
    p =>
      p.note.toLowerCase().includes(filter.toLowerCase()) ||
      p.model.toLowerCase().includes(filter.toLowerCase())
  )

  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE)

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
    return <p>Loading...</p>
  }

  return (
    <div>
      <Input
        placeholder="Filter by note or model..."
        value={filter}
        onChange={e => {
          setFilter(e.target.value)
          setCurrentPage(1)
        }}
        className="mb-4"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedHistory.map(prompt => (
            <TableRow key={prompt.id}>
              <TableCell>{prompt.model}</TableCell>
              <TableCell>{prompt.note}</TableCell>
              <TableCell>{new Date(prompt.timestamp).toLocaleString()}</TableCell>
              <TableCell>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(prompt)}>Edit</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Prompt Note</DialogTitle>
                    </DialogHeader>
                    <Textarea value={editedNote} onChange={(e) => setEditedNote(e.target.value)} rows={5}/>
                    <DialogFooter>
                      <Button onClick={handleSaveEdit}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deletePrompt(prompt.id)}
                  className="ml-2"
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-between items-center mt-4">
        <Button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => p - 1)}
        >
          Previous
        </Button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <Button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(p => p + 1)}
        >
          Next
        </Button>
      </div>

      
    </div>
  )
}
