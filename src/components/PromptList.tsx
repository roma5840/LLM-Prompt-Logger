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
                  <TableHead className="w-[140px]">Model</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead className="w-[25%]">Notes</TableHead>
                  <TableHead className="w-[120px] text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="align-top">
                        <Badge variant="secondary" className="bg-primary/10 text-primary/90 border-primary/20 hover:bg-primary/20">
                          {log.model}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm leading-relaxed align-top">
                        <p className="whitespace-pre-wrap break-words">
                          {log.prompt.length > PROMPT_TRUNCATE_LENGTH
                            ? `${log.prompt.substring(0, PROMPT_TRUNCATE_LENGTH)}...`
                            : log.prompt}
                        </p>
                        {log.prompt.length > PROMPT_TRUNCATE_LENGTH && (
                          <Button
                            variant="link"
                            className="p-0 h-auto text-xs"
                            onClick={() => setViewingPrompt(log)}
                          >
                            Show more
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground align-top break-words">{log.notes}</TableCell>
                      <TableCell className="text-right text-muted-foreground align-top whitespace-nowrap">
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
