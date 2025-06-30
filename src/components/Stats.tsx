// src/components/Stats.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { Prompt, Model } from '@/lib/types'
import { useMemo } from 'react'
import { Skeleton } from './ui/skeleton'

interface StatsProps {
  history: Prompt[]
  models: Model[]
}

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function Stats({ history, models }: StatsProps) {
  const totalPrompts = history.length
  const dailyPrompts = history.filter(p => new Date(p.timestamp) >= getStartOfToday()).length

  const modelCounts = useMemo(() => {
    const counts: { [key: string]: number } = {}
    models.forEach(model => {
      counts[model] = 0
    })
    history.forEach(prompt => {
      if (counts[prompt.model] !== undefined) {
        counts[prompt.model]++
      }
    })
    return models.map(model => ({ name: model, count: counts[model] })).filter(m => m.count > 0);
  }, [history, models])
  
  const dailyUsage = useMemo(() => {
    if (history.length === 0) return [];
    const usage: { [date: string]: { date: string, [model: string]: number | string } } = {};
    
    const sortedHistory = [...history].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());

    sortedHistory.forEach(prompt => {
      const date = new Date(prompt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!usage[date]) {
        usage[date] = { date };
        models.forEach(m => usage[date][m] = 0);
      }
      if (typeof usage[date][prompt.model] === 'number') {
        (usage[date][prompt.model] as number)++;
      }
    });
    return Object.values(usage);
  }, [history, models]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalPrompts}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Today's Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{dailyPrompts}</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Model Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {modelCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={modelCounts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No data for this period.</div>
          )}
        </CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Daily Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                {models.map((model, i) => (
                  <Line key={model} type="monotone" dataKey={model} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">No data for this period.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}