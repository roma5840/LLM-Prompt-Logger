// src/app/page.tsx
'use client'

import { useState, useMemo } from 'react'
import type { DateRange } from "react-day-picker"
import { useData } from '@/hooks/use-data'
import { Stats } from '@/components/Stats'
import { PromptList } from '@/components/PromptList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

const getDefaultDateRange = (): DateRange => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 13); // Set 'from' to 13 days ago for a 14-day total period
  return { from, to };
};

export default function Home() {
  const data = useData()
  const [filterModel, setFilterModel] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getDefaultDateRange())
  const [searchQuery, setSearchQuery] = useState('')

  const filteredHistory = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return data.history
      .filter(p => {
        if (filterModel === 'all') return true
        return p.model === filterModel
      })
      .filter(p => {
        if (!dateRange || (!dateRange.from && !dateRange.to)) return true
        const timestamp = p.timestamp.getTime()
        const from = dateRange.from ? new Date(dateRange.from).setHours(0, 0, 0, 0) : null
        const to = dateRange.to ? new Date(dateRange.to).setHours(23, 59, 59, 999) : null
        if (from && to) return timestamp >= from && timestamp <= to
        if (from) return timestamp >= from
        if (to) return timestamp <= to
        return true
      })
      .filter(p => {
        if (!query) return true;
        return (
          p.model.toLowerCase().includes(query) ||
          p.note.toLowerCase().includes(query)
        );
      })
  }, [data.history, filterModel, dateRange, searchQuery])

  const clearFilters = () => {
    setFilterModel('all')
    setDateRange(undefined)
    setSearchQuery('')
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Select value={filterModel} onValueChange={setFilterModel}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {data.models.map(model => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Button variant="ghost" onClick={clearFilters}>Clear</Button>
        </div>
      </div>

      <Stats history={filteredHistory} models={data.models} />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Prompt History</CardTitle>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search in notes & models..."
              className="w-full rounded-lg bg-background pl-8 sm:w-[200px] lg:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <PromptList
            loading={data.loading}
            history={filteredHistory}
            deletePrompt={data.deletePrompt}
            updatePromptNote={data.updatePromptNote}
          />
        </CardContent>
      </Card>
    </main>
  )
}