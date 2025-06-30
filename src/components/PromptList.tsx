"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PromptLog } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { MoreHorizontal } from "lucide-react";

interface PromptListProps {
  logs: PromptLog[];
  totalLogs: number;
}

const PROMPT_TRUNCATE_LENGTH = 150;

export function PromptList({ logs, totalLogs }: PromptListProps) {
  const [viewingPrompt, setViewingPrompt] = useState<PromptLog | null>(null);

  return (
    <>
      <Card className="border-primary/20 shadow-lg shadow-primary/10">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Prompt History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/10 text-primary/90 border-primary/20 hover:bg-primary/20">
                          {log.model}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm leading-relaxed max-w-md">
                         {log.prompt.length > PROMPT_TRUNCATE_LENGTH ? (
                          <div className="flex items-center justify-between">
                            <p className="truncate pr-2">{log.prompt}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => setViewingPrompt(log)}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">View full prompt</span>
                            </Button>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{log.prompt}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.notes}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {format(log.timestamp, 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {totalLogs > 0 ? 'No results found for your filters.' : 'No prompts logged yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Dialog open={!!viewingPrompt} onOpenChange={(open) => !open && setViewingPrompt(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Full Prompt</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] my-4 pr-6">
            <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {viewingPrompt?.prompt}
            </p>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
