"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Search, SlidersHorizontal, X } from "lucide-react"

interface FilterControlsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  dateRange: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
  onClearFilters: () => void
  onManageModels: () => void
  resultCount: number
  totalCount: number
}

export function FilterControls({
  searchQuery,
  onSearchChange,
  dateRange,
  onDateChange,
  onClearFilters,
  onManageModels,
  resultCount,
  totalCount,
}: FilterControlsProps) {
  const hasFilters = searchQuery || dateRange

  return (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search prompts, notes, or models..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2">
                <DateRangePicker date={dateRange} setDate={onDateChange} />
                <Button variant="outline" onClick={onManageModels}>
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Manage Models
                </Button>
                {hasFilters && (
                    <Button variant="ghost" onClick={onClearFilters}>
                        <X className="mr-2 h-4 w-4" />
                        Clear
                    </Button>
                )}
            </div>
        </div>
        <p className="text-sm text-muted-foreground">
            Showing {resultCount} of {totalCount} total prompts.
        </p>
    </div>
  )
}
