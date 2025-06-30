// src/components/MainLayout.tsx
'use client'

import React from 'react'
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarInset, SidebarHeader, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar'
import { PromptLogger } from '@/components/PromptLogger'
import { ModelManager } from '@/components/ModelManager'
import { useData } from '@/hooks/use-data'
import { Toaster } from '@/components/ui/toaster'
import { BotMessageSquare } from 'lucide-react'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const data = useData()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2">
              <BotMessageSquare className="w-8 h-8 text-primary" />
              <h1 className="text-xl font-semibold">PromptLog</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <div className="flex flex-col gap-6">
              <PromptLogger addPrompt={data.addPrompt} models={data.models} />
              <ModelManager
                models={data.models}
                updateUserModels={data.updateUserModels}
                syncKey={data.syncKey}
                migrateToCloud={data.migrateToCloud}
                linkDeviceWithKey={data.linkDeviceWithKey}
                handleExportData={data.handleExportData}
                handleImportData={data.handleImportData}
              />
            </div>
          </SidebarContent>
          <SidebarFooter className="p-4 text-xs text-muted-foreground">
            Version 1.0.0
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col">
          <header className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <SidebarTrigger />
            {/* Future header content can go here, e.g., user menu */}
          </header>
          <SidebarInset>
            {children}
          </SidebarInset>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  )
}