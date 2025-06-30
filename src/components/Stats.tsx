'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
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
    const usage: { [date: string]: { date: string, [model: string]: number | string } } = {};
    history.forEach(prompt => {
      const date = new Date(prompt.timestamp).toLocaleDateString();
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Model Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={modelCounts} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={80} stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Daily Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {models.map((model, i) => (
                <Line key={model} type="monotone" dataKey={model} stroke={`#${Math.floor(Math.random()*16777215).toString(16)}`} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
