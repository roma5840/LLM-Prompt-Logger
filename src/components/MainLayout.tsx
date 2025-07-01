// src/components/MainLayout.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarFooter, useSidebar } from '@/components/ui/sidebar'
import { PromptLogger } from '@/components/PromptLogger'
import { useData } from '@/hooks/use-data'
import { BotMessageSquare, LayoutDashboard, Settings, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from './ui/separator'

function MainContent({ children }: { children: React.ReactNode }) {

  return (
    <div className={cn(
      "flex-1 flex flex-col transition-all duration-200 ease-linear"
    )}>
      <header className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <SidebarTrigger />
      </header>
      
      <div className={cn(
        "w-full max-w-5xl mx-auto flex-1",
        "px-4 sm:px-6 lg:px-8"
      )}>
        {children}
      </div>
    </div>
  )
}

function NavLinks() {
  const pathname = usePathname();
  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {links.map(link => {
        const Icon = link.icon;
        const isActive = pathname === link.href;
        return (
          <Button
            key={link.href}
            asChild
            variant={isActive ? 'secondary' : 'ghost'}
            className="w-full justify-start"
          >
            <Link href={link.href}>
              <Icon className="mr-2 h-4 w-4" />
              {link.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const data = useData()
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);

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
            <div className="flex flex-col gap-4">
               <Dialog open={isLoggerOpen} onOpenChange={setIsLoggerOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Log New Prompt
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Log a New Prompt</DialogTitle>
                  </DialogHeader>
                  <PromptLogger
                    addPrompt={data.addPrompt}
                    models={data.models}
                    onPromptLogged={() => setIsLoggerOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              <Separator />
              <NavLinks />
            </div>
          </SidebarContent>
          <SidebarFooter className="p-4 text-xs text-muted-foreground">
            Version 1.3.8
          </SidebarFooter>
        </Sidebar>
        
        <MainContent>
          {children}
        </MainContent>
      </div>
    </SidebarProvider>
  )
}