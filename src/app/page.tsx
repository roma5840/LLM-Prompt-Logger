"use client";

import { useState, useEffect } from "react";
import { PromptLogger } from "@/components/PromptLogger";
import { PromptList } from "@/components/PromptList";
import { Stats } from "@/components/Stats";
import type { PromptLog } from "@/lib/types";
import { Bot } from "lucide-react";

const initialLogs: PromptLog[] = [
  {
    id: "1",
    prompt: "Write a short story about a robot who discovers music.",
    model: "GPT-4",
    notes: "Creative writing session",
    timestamp: new Date("2023-10-26T10:00:00Z"),
  },
  {
    id: "2",
    prompt: "Generate a python script to parse a CSV file.",
    model: "Claude 3",
    notes: "Utility script for work",
    timestamp: new Date("2023-10-25T15:30:00Z"),
  },
  {
    id: "3",
    prompt: "What are the key differences between React Server Components and Client Components?",
    model: "Gemini 1.5",
    notes: "Tech research",
    timestamp: new Date("2023-10-25T11:00:00Z"),
  },
    {
    id: "4",
    prompt: "Suggest three potential names for a new coffee shop.",
    model: "GPT-4",
    notes: "Branding ideas",
    timestamp: new Date("2023-10-24T09:00:00Z"),
  },
];

export default function Home() {
  const [logs, setLogs] = useState<PromptLog[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedLogs = localStorage.getItem("promptLogs");
    if (savedLogs) {
      const parsedLogs = JSON.parse(savedLogs).map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
      setLogs(parsedLogs);
    } else {
      setLogs(initialLogs);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("promptLogs", JSON.stringify(logs));
    }
  }, [logs, isClient]);

  const handleLogPrompt = (data: Omit<PromptLog, 'id' | 'timestamp'>) => {
    setIsLogging(true);
    setTimeout(() => {
      const newLog: PromptLog = {
        id: new Date().toISOString(),
        ...data,
        timestamp: new Date(),
      };
      setLogs((prevLogs) => [newLog, ...prevLogs]);
      setIsLogging(false);
    }, 500);
  };
  
  if (!isClient) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Bot className="w-12 h-12 animate-pulse text-primary" />
        </div>
      );
  }

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-bold font-headline text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
          PromptLog
        </h1>
        <p className="text-muted-foreground mt-2">
          Your Personal Dashboard for LLM Interactions
        </p>
      </header>

      <div className="space-y-8">
        <Stats logs={logs} />
        <PromptLogger onLogPrompt={handleLogPrompt} isLogging={isLogging} />
        <PromptList logs={logs} />
      </div>
    </main>
  );
}
