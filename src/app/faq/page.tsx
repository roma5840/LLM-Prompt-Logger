'use client'

import { MainLayout } from '@/components/MainLayout'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const faqData = [
  {
    question: "What is PromptLog?",
    answer: "PromptLog is a personal, privacy-focused application designed to help you log, analyze, and manage your interactions with Large Language Models (LLMs). It allows you to save notes, track token usage, and visualize your activity over time, all while keeping your data secure."
  },
  {
    question: "Is my data private and secure?",
    answer: "Yes. Security is our top priority. The app operates in two modes: \n\n1. Local-Only: By default, all your data is stored directly on your device in your browser's local storage. It never leaves your computer.\n\n2. E2E Encrypted Sync: If you choose to enable cloud sync, your data is end-to-end encrypted. This means your private data (like prompt notes) is encrypted on your device using a Master Password that only you know. The server only stores the encrypted, unreadable data. We cannot access your notes."
  },
  {
    question: "What happens if I forget my Master Password?",
    answer: "Your Master Password is the key to decrypting your data. We do not store it and have no way to recover it for you. If you forget your Master Password, your synced data will be permanently inaccessible. Please store it in a safe and secure place, like a password manager."
  },
  {
    question: "How does cloud sync work?",
    answer: "When you enable cloud sync, you create a Master Password. This password is used to derive an encryption key on your device. Your prompt notes and token counts are then encrypted with this key before being sent to our secure cloud storage (hosted on Supabase). This ensures that even we cannot read your sensitive data."
  },
  {
    question: "Can I use this app offline?",
    answer: "Yes. The app is fully functional offline. Any prompts you log while offline will be stored locally on your device. If you have cloud sync enabled, they will be synced automatically the next time you are online."
  },
  {
    question: "How do I move my data to another device?",
    answer: "You have two options:\n\n1. Cloud Sync (Recommended): Enable sync on your first device. On your new device, choose 'Link This Device' on the Settings page and enter your Sync Key and Master Password. Your encrypted data will be downloaded and decrypted locally.\n\n2. Manual Export/Import: On your original device, go to Settings and click 'Export Data'. This will save a JSON file of your history. On the new device, use the 'Import Data' button to load this file."
  },
  {
    question: "What's the difference between 'Unlink Device' and 'Delete Account'?",
    answer: "Unlink Device: This action only affects the current device. It removes the sync and encryption keys, effectively logging you out of the cloud account on that device. Your data in the cloud and on other synced devices remains untouched. \n\nDelete Account: This is a permanent and irreversible action. It deletes your entire cloud account, including all encrypted data, from our servers. This will affect all devices synced to that account."
  },
  {
    question: "Why is there a character limit on notes when sync is enabled?",
    answer: "To be transparent, this is a hobby project and running a sync server has real costs. To keep the E2E Encrypted Sync feature available for everyone to try, synced notes are limited to 1,500 characters. Notes stored only locally on your device have no limit."
  },
  {
    question: "How are output tokens calculated?",
    answer: "The token count is an estimate calculated based on the length of the text you paste into the 'LLM Output' field. It uses a common heuristic where 4 characters roughly equal 1 token. This provides a good approximation for tracking usage but may not match the exact token count from a specific model's API."
  }
];


export default function FaqPage() {
  return (
    <MainLayout>
      <main className="flex-1 py-4 md:py-6 lg:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Frequently Asked Questions</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full">
              {faqData.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>
                    <span className="text-left">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line text-muted-foreground">
                    <p className="text-left">{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  )
}