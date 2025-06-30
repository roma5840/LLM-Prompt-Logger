"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PromptLog } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';

interface PromptListProps {
  logs: PromptLog[];
  totalLogs: number;
}

export function PromptList({ logs, totalLogs }: PromptListProps) {
  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/10">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Prompt History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Model</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead className="w-[200px]">Notes</TableHead>
                <TableHead className="text-right w-[150px]">Date</TableHead>
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
                    <TableCell className="font-mono text-sm leading-relaxed">{log.prompt}</TableCell>
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
  );
}
