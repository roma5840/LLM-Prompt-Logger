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

const getStartOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
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

const CustomLegend = (props: any) => {
  const { payload } = props;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4 text-xs text-muted-foreground">
      {payload.map((entry: any, index: number) => (
        <div key={`item-${index}`} className="flex items-center space-x-2">
          <span style={{ backgroundColor: entry.color }} className="inline-block w-2.5 h-2.5 rounded-full" />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const formatLargeNumber = (num: number): string => {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
};

const formatCost = (cost: number) => {
    if (cost < 0.0001 && cost > 0) return "<$0.0001";
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
};


export function Stats({ history, models }: StatsProps) {
  const modelCostMap = useMemo(() => {
    const map = new Map<string, { inputCost: number; outputCost: number }>();
    models.forEach(model => {
      map.set(model.name, { inputCost: model.inputCost, outputCost: model.outputCost });
    });
    return map;
  }, [models]);

  const calculateCost = (prompts: Prompt[]) => {
    return prompts.reduce((acc, p) => {
      const costs = modelCostMap.get(p.model);
      if (!costs) return acc;
      const inputCost = (p.input_tokens || 0) / 1_000_000 * costs.inputCost;
      const outputCost = (p.output_tokens || 0) / 1_000_000 * costs.outputCost;
      return acc + inputCost + outputCost;
    }, 0);
  };
  
  const totalPrompts = history.length
  const dailyPrompts = history.filter(p => new Date(p.timestamp) >= getStartOfToday()).length
  
  const totalCost = useMemo(() => calculateCost(history), [history, modelCostMap]);
  const dailyCost = useMemo(() => calculateCost(history.filter(p => new Date(p.timestamp) >= getStartOfToday())), [history, modelCostMap]);
  const monthlyCost = useMemo(() => calculateCost(history.filter(p => new Date(p.timestamp) >= getStartOfMonth())), [history, modelCostMap]);

  const modelColorMap = useMemo(() => {
    const map = new Map<string, string>();
    models.forEach((model, i) => {
        map.set(model.name, COLORS[i % COLORS.length]);
    });
    return map;
  }, [models]);

  const activeModelsInPeriod = useMemo(() => {
    return new Set(history.map(p => p.model));
  }, [history]);

  const modelCounts = useMemo(() => {
    const counts: { [key: string]: number } = {}
    models.forEach(model => {
      counts[model.name] = 0
    })
    history.forEach(prompt => {
      if (counts[prompt.model] !== undefined) {
        counts[prompt.model]++
      }
    })
    return models.map(model => ({ name: model.name, count: counts[model.name] })).filter(m => m.count > 0);
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalPrompts.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Today's Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{dailyPrompts.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{formatCost(totalCost)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cost Today</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{formatCost(dailyCost)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cost This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{formatCost(monthlyCost)}</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-3">
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
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Daily Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend content={<CustomLegend />} />
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