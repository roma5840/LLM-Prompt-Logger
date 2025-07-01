// src/components/MainLayout.tsx
'use client'

import React from 'react'
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarFooter, useSidebar } from '@/components/ui/sidebar'
import { PromptLogger } from '@/components/PromptLogger'
import { ModelManager } from '@/components/ModelManager'
import { useData } from '@/hooks/use-data'
import { Toaster } from '@/components/ui/toaster'
import { BotMessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

function MainContent({ children }: { children: React.ReactNode }) {
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <div className={cn(
      "flex-1 flex flex-col transition-all duration-200 ease-linear",
      !isMobile && isCollapsed && "ml-0",
      !isMobile && !isCollapsed && "ml-4"
    )}>
      <header className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <SidebarTrigger />
      </header>

      <div className={cn(
        "flex-1 transition-all duration-200 ease-linear",
        isCollapsed && "flex justify-center px-8",
        !isCollapsed && "flex justify-start pl-8 pr-8"
      )}>
        <div className={cn(
          "w-full transition-all duration-200 ease-linear",
          isCollapsed && "max-w-7xl",
          !isCollapsed && "max-w-none"
        )}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const data = useData()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
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
                history={data.history}
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
            Version 1.3.1
          </SidebarFooter>
        </Sidebar>
        
        <MainContent>
          {children}
        </MainContent>
      </div>
      <Toaster />
    </SidebarProvider>
  )
}