"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PromptLog } from "@/lib/types";
import { BotMessageSquare } from "lucide-react";

const formSchema = z.object({
  prompt: z.string().min(1, { message: "Prompt cannot be empty." }),
  model: z.enum(["GPT-4", "Claude 3", "Gemini 1.5", "Other"]),
  notes: z.string().optional(),
});

type PromptFormValues = z.infer<typeof formSchema>;

interface PromptLoggerProps {
  onLogPrompt: (data: Omit<PromptLog, 'id' | 'timestamp'>) => void;
  isLogging: boolean;
}

const models = ["GPT-4", "Claude 3", "Gemini 1.5", "Other"] as const;

export function PromptLogger({ onLogPrompt, isLogging }: PromptLoggerProps) {
  const form = useForm<PromptFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: "",
      model: "GPT-4",
      notes: "",
    },
  });

  function onSubmit(data: PromptFormValues) {
    onLogPrompt(data);
    form.reset();
  }

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/10">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <BotMessageSquare className="text-primary" />
          Log a New Prompt
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your prompt here..."
                      className="resize-y min-h-[120px] font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LLM Model</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes / Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Code generation, brainstorming" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full md:w-auto" disabled={isLogging}>
              {isLogging ? "Logging..." : "Log Prompt"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
