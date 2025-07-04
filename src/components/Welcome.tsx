// src/components/Welcome.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BotMessageSquare, BarChart3, ShieldCheck, FileDown, ArrowRight } from 'lucide-react'

interface WelcomeProps {
  onGetStarted: () => void
}

const features = [
  {
    icon: <BotMessageSquare className="h-8 w-8 text-primary" />,
    title: 'Context-Aware Logging',
    description: 'Go beyond single prompts. Group interactions into conversations and see how costs accumulate with each turn, including the full conversational context.',
  },
  {
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    title: 'Detailed Cost Analysis',
    description: 'Define custom models with unique input, output, and cached context prices. Visualize your spending with insightful charts to understand your usage patterns.',
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: 'E2E Encrypted Sync',
    description: 'Optionally sync across devices. Your data is encrypted on your device with a password only you know, making it unreadable to the server.',
  },
  {
    icon: <FileDown className="h-8 w-8 text-primary" />,
    title: 'Local-First & Portable',
    description: 'Works entirely on your device with no account needed. Easily export your entire history to a JSON file at any time.',
  },
]

export function Welcome({ onGetStarted }: WelcomeProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-6 lg:p-8 bg-background">
      <div className="max-w-4xl w-full mx-auto">
        <Card className="border-0 md:border shadow-none md:shadow-sm">
          <CardHeader className="text-center p-8">
            <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit mb-4">
              <BotMessageSquare className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Welcome to PromptLog
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Your personal, privacy-focused dashboard for logging, analyzing, and syncing your Large Language Model prompts.
            </p>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="flex-shrink-0">{feature.icon}</div>
                  <div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Button size="lg" onClick={onGetStarted}>
                Let's Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}