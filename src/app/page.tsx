"use client";

import { useState, useEffect, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { PromptLogger } from "@/components/PromptLogger";
import { PromptList } from "@/components/PromptList";
import { Stats } from "@/components/Stats";
import { FilterControls } from "@/components/FilterControls";
import { ModelManager } from "@/components/ModelManager";
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

const defaultModels = ["GPT-4", "Claude 3", "Gemini 1.5", "Other"];

export default function Home() {
  const [logs, setLogs] = useState<PromptLog[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isModelManagerOpen, setModelManagerOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Load logs
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
    // Load models
    const savedModels = localStorage.getItem("promptModels");
    if (savedModels) {
      setModels(JSON.parse(savedModels));
    } else {
      setModels(defaultModels);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem("promptLogs", JSON.stringify(logs));
    }
  }, [logs, isClient]);
  
  useEffect(() => {
    if (isClient) {
      localStorage.setItem("promptModels", JSON.stringify(models));
    }
  }, [models, isClient]);

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
  
  const handleClearFilters = () => {
    setSearchQuery("");
    setDateRange(undefined);
  };

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (!dateRange?.from) return true;
        const logDate = new Date(log.timestamp);
        logDate.setHours(0,0,0,0);
        
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0,0,0,0);

        if (dateRange.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(0,0,0,0);
            return logDate >= fromDate && logDate <= toDate;
        }
        return logDate.getTime() === fromDate.getTime();
      })
      .filter((log) => {
        if (!searchQuery) return true;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return (
          log.prompt.toLowerCase().includes(lowerCaseQuery) ||
          log.notes.toLowerCase().includes(lowerCaseQuery) ||
          log.model.toLowerCase().includes(lowerCaseQuery)
        );
      });
  }, [logs, searchQuery, dateRange]);
  
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
        <Stats logs={filteredLogs} models={models} />
        <PromptLogger onLogPrompt={handleLogPrompt} isLogging={isLogging} models={models} />
        
        <div className="space-y-4">
          <FilterControls 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            dateRange={dateRange}
            onDateChange={setDateRange}
            onClearFilters={handleClearFilters}
            onManageModels={() => setModelManagerOpen(true)}
            resultCount={filteredLogs.length}
            totalCount={logs.length}
          />
          <PromptList logs={filteredLogs} totalLogs={logs.length} />
        </div>
      </div>
      <ModelManager 
        open={isModelManagerOpen}
        onOpenChange={setModelManagerOpen}
        models={models}
        setModels={setModels}
      />
    </main>
  );
}
