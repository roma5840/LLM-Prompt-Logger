'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from 'recharts'
import { Prompt, Model } from '@/lib/types'
import { useMemo } from 'react'

interface StatsProps {
  history: Prompt[]
  models: Model[]
}

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const CustomModelTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-popover px-3 py-1.5 text-sm shadow-sm">
        <p className="text-popover-foreground">
          {label}: <span className="font-bold text-muted-foreground">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}


export function Stats({ history, models }: StatsProps) {
  const totalPrompts = history.length
  const dailyPrompts = history.filter(p => new Date(p.timestamp) >= getStartOfToday()).length

  const modelColorMap = useMemo(() => {
    const map = new Map<string, string>();
    models.forEach((model, i) => {
        map.set(model, COLORS[i % COLORS.length]);
    });
    return map;
  }, [models]);

  const activeModelsInPeriod = useMemo(() => {
    return new Set(history.map(p => p.model));
  }, [history]);

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
  
  const barChartHeight = modelCounts.length > 0 ? Math.max(150, modelCounts.length * 35) : 150;

  const dailyUsage = useMemo(() => {
    const promptCountsByDate = new Map<string, Map<string, number>>();
    history.forEach(prompt => {
      const dateKey = new Date(prompt.timestamp).toLocaleDateString('en-CA'); 
      if (!promptCountsByDate.has(dateKey)) {
        promptCountsByDate.set(dateKey, new Map());
      }
      const dayMap = promptCountsByDate.get(dateKey)!;
      const currentCount = dayMap.get(prompt.model) || 0;
      dayMap.set(prompt.model, currentCount + 1);
    });

    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      last14Days.push(d);
    }
    
    return last14Days.map(date => {
      const dateKey = date.toLocaleDateString('en-CA');
      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const chartDataPoint: { date: string, [model: string]: number | string } = { date: displayDate };
      const countsForDay = promptCountsByDate.get(dateKey);

      activeModelsInPeriod.forEach(model => {
        chartDataPoint[model] = (countsForDay && countsForDay.get(model)) || 0;
      });

      return chartDataPoint;
    });
  }, [history]);

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
            <ResponsiveContainer width="100%" height={barChartHeight}>
              <BarChart data={modelCounts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => truncateText(value, 10)} />
                <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<CustomModelTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {modelCounts.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={modelColorMap.get(entry.name) || '#8884d8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">No data for this period.</div>
          )}
        </CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Daily Usage</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {dailyUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                {Array.from(activeModelsInPeriod).map((model) => (
                  <Line key={model} type="monotone" dataKey={model} stroke={modelColorMap.get(model)} dot={false} strokeWidth={2} />
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