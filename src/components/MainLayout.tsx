// src/components/MainLayout.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarFooter, useSidebar } from '@/components/ui/sidebar'
import { ConversationStarter } from '@/components/ConversationStarter'
import { Welcome } from '@/components/Welcome'
import { useData } from '@/hooks/use-data'
import { BotMessageSquare, LayoutDashboard, Settings, Plus, Loader2, Shield, HelpCircle } from 'lucide-react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle as CardTitleUI } from '@/components/ui/card'
import { Input } from './ui/input'
import { useToast } from '@/hooks/use-toast'
import { ThemeToggle } from '@/components/ThemeToggle'


const WELCOME_DISMISSED_KEY = 'promptlog_welcome_dismissed';

function UnlockScreen() {
  const { unlock, syncing } = useData();
  const { toast } = useToast();
  const [password, setPassword] = useState('');

  const handleUnlock = async () => {
    if (!password) {
      toast({ title: 'Password required', variant: 'destructive' });
      return;
    }
    try {
      await unlock(password);
    } catch (error: any) {
      toast({ title: 'Unlock Failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <CardTitleUI>Unlock Your Data</CardTitleUI>
          <CardDescription>Enter your master password to decrypt and access your data.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input 
            type="password" 
            placeholder="Master Password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            disabled={syncing}
          />
          <Button onClick={handleUnlock} disabled={syncing || !password}>
            {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unlock
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


function MainContent({ children }: { children: React.ReactNode }) {

  return (
    <div className={cn(
      "flex-1 flex flex-col transition-all duration-200 ease-linear min-w-0"
    )}>
      <header className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <SidebarTrigger />
        <ThemeToggle />
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
    { href: '/faq', label: 'FAQ', icon: HelpCircle },
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (data.loading) {
      return;
    }
    const welcomeDismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    const isNewUser = data.conversations.length === 0 && !data.syncKey;

    if (isNewUser && !welcomeDismissed) {
      setShowWelcome(true);
    }
    setIsCheckingOnboarding(false);
  }, [data.loading, data.conversations, data.syncKey]);

  const handleGetStarted = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    setShowWelcome(false);
  };

  const handleConversationStarted = () => {
    setIsLoggerOpen(false);
  };

  if (isCheckingOnboarding) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showWelcome) {
    return <Welcome onGetStarted={handleGetStarted} />;
  }
  
  if (data.isLocked) {
    return <UnlockScreen />;
  }

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
               <Dialog open={isLoggerOpen} onOpenChange={isSubmitting ? () => {} : setIsLoggerOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    New Conversation
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-md"
                  onInteractOutside={(e) => {
                    if (isSubmitting) {
                      e.preventDefault();
                    }
                  }}
                   onEscapeKeyDown={(e) => {
                    if (isSubmitting) {
                      e.preventDefault();
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Start a New Conversation</DialogTitle>
                  </DialogHeader>
                  <ConversationStarter
                    createConversation={data.createConversation}
                    onConversationStarted={handleConversationStarted}
                    isSubmitting={isSubmitting}
                    setIsSubmitting={setIsSubmitting}
                  />
                </DialogContent>
              </Dialog>
              <Separator />
              <NavLinks />
            </div>
          </SidebarContent>
          <SidebarFooter className="p-4 text-xs text-muted-foreground">
            Version 2.0.70
          </SidebarFooter>
        </Sidebar>
        
        <MainContent>
          {children}
        </MainContent>
      </div>
    </SidebarProvider>
  )
}