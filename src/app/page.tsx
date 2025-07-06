// src/app/page.tsx
'use client'

import { useState, useMemo } from 'react'
import type { DateRange } from "react-day-picker"
import { useData } from '@/hooks/use-data'
import { Stats } from '@/components/Stats'
import { ConversationList } from '@/components/ConversationList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { MainLayout } from '@/components/MainLayout'

const getDefaultDateRange = (): DateRange => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29); // Set 'from' to 29 days ago for a 30-day total period
  return { from, to };
};

export default function Home() {
  const data = useData()
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange())
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return data.conversations
      .filter(c => {
        if (!dateRange || (!dateRange.from && !dateRange.to)) return true
        const timestamp = new Date(c.updated_at).getTime()
        const from = dateRange.from ? new Date(dateRange.from).setHours(0, 0, 0, 0) : null
        const to = dateRange.to ? new Date(dateRange.to).setHours(23, 59, 59, 999) : null
        if (from && to) return timestamp >= from && timestamp <= to
        if (from) return timestamp >= from
        if (to) return timestamp <= to
        return true
      })
      .filter(c => {
        if (!query) return true;
        // Search in title or any message content
        return (
          c.title.toLowerCase().includes(query) ||
          c.messages.some(m => m.content.toLowerCase().includes(query))
        );
      })
  }, [data.conversations, dateRange, searchQuery])

  const clearFilters = () => {
    setDateRange(undefined)
    setSearchQuery('')
  }

  return (
    <MainLayout>
      <main className="flex-1 py-4 md:py-6 lg:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <DateRangePicker date={dateRange} setDate={setDateRange} />
            <Button variant="ghost" onClick={clearFilters}>Clear</Button>
          </div>
        </div>

        <Stats conversations={filteredConversations} models={data.models} dateRange={dateRange} />

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Conversation History</CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search conversations..."
                className="w-full rounded-lg bg-background pl-8 sm:w-[200px] lg:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <ConversationList
                loading={data.loading}
                conversations={filteredConversations}
                deleteConversation={data.deleteConversation}
                updateConversationTitle={data.updateConversationTitle}
                models={data.models}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  )
}