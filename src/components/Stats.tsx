'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Conversation, Model, Turn } from '@/lib/types'
import { useMemo } from 'react'
import type { DateRange } from "react-day-picker"

interface StatsProps {
  conversations: Conversation[]
  models: Model[]
  dateRange?: DateRange
}

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const getStartOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#a56eff', '#ff6e9f', '#ffc107'];

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, p: any) => sum + p.value, 0);
    return (
      <div className="rounded-lg border bg-popover p-2 text-sm shadow-sm min-w-[200px]">
        <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-popover-foreground">{label}</p>
            {payload.length > 1 && total > 0 && (
                <p className="text-xs text-muted-foreground">Total: {formatter(total)}</p>
            )}
        </div>
        <div className="space-y-1">
            {payload.slice().reverse().map((pld: any, index: number) => (
                pld.value > 0 && (
                    <div key={index} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pld.color }} />
                            <p className="text-muted-foreground text-xs">{pld.name}</p>
                        </div>
                        <p className="font-medium text-popover-foreground text-xs">{formatter(pld.value)}</p>
                    </div>
                )
            ))}
        </div>
      </div>
    );
  }
  return null;
};

const formatCost = (cost: number) => {
    if (cost < 0.0001 && cost > 0) return "<$0.0001";
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
};

const formatChartCost = (cost: number) => {
    if (cost < 0.000001 && cost > 0) return "<$0.000001";
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
};

const formatToken = (tokens: number) => tokens.toLocaleString();

export function Stats({ conversations, models, dateRange }: StatsProps) {
  const modelCostMap = useMemo(() => {
    const map = new Map<string, Model>();
    models.forEach(model => {
      map.set(model.name, model);
    });
    return map;
  }, [models]);

  const allMessages = useMemo(() => conversations.flatMap(c => c.messages), [conversations]);

  const allTurnsWithData = useMemo(() => {
    const turnsWithData: (Turn & { cost: number; contextTokens: number })[] = [];
    conversations.forEach(convo => {
      let cumulativeInputTokens = 0;
      let cumulativeOutputTokens = 0;
      convo.messages.forEach(turn => {
        const model = modelCostMap.get(turn.model);
        const contextTokens = cumulativeInputTokens + cumulativeOutputTokens;
        const turnInputTokens = turn.input_tokens || 0;
        const turnOutputTokens = turn.output_tokens || 0;
        
        let turnCost = 0;
        if (model) {
            if (contextTokens > 0) {
                const contextCostPerToken = (model.isCacheEnabled ? model.cachedInputCost : model.inputCost) / 1_000_000;
                turnCost += contextTokens * contextCostPerToken;
            }
            turnCost += turnInputTokens * (model.inputCost / 1_000_000);
            turnCost += turnOutputTokens * (model.outputCost / 1_000_000);
        }

        turnsWithData.push({ ...turn, cost: turnCost, contextTokens });

        cumulativeInputTokens += turnInputTokens;
        cumulativeOutputTokens += turnOutputTokens;
      });
    });
    return turnsWithData;
  }, [conversations, modelCostMap]);
  
  const totalConversations = conversations.length;
  const totalMessages = allMessages.length;
  const dailyMessages = allMessages.filter(m => new Date(m.timestamp) >= getStartOfToday()).length;
  
  const totalCost = useMemo(() => allTurnsWithData.reduce((sum, turn) => sum + turn.cost, 0), [allTurnsWithData]);
  const dailyCost = useMemo(() => allTurnsWithData.filter(t => new Date(t.timestamp) >= getStartOfToday()).reduce((sum, turn) => sum + turn.cost, 0), [allTurnsWithData]);
  const monthlyCost = useMemo(() => allTurnsWithData.filter(t => new Date(t.timestamp) >= getStartOfMonth()).reduce((sum, turn) => sum + turn.cost, 0), [allTurnsWithData]);

  const { dailyCosts, dailyTokens, dailyTurns, modelNames } = useMemo(() => {
    const modelNames = Array.from(new Set(allTurnsWithData.map(t => t.model))).sort();

    const dataByDate = new Map<string, {
      costs: Record<string, number>,
      tokens: Record<string, number>,
      turns: Record<string, number>
    }>();

    allTurnsWithData.forEach(turn => {
      const dateKey = new Date(turn.timestamp).toLocaleDateString('en-CA');
      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, {
          costs: Object.fromEntries(modelNames.map(m => [m, 0])),
          tokens: Object.fromEntries(modelNames.map(m => [m, 0])),
          turns: Object.fromEntries(modelNames.map(m => [m, 0])),
        });
      }
      const dayData = dataByDate.get(dateKey)!;
      dayData.costs[turn.model] += turn.cost;
      
      const totalTokensForTurn = turn.contextTokens + (turn.input_tokens || 0) + (turn.output_tokens || 0);
      dayData.tokens[turn.model] += totalTokensForTurn;

      dayData.turns[turn.model] += 1;
    });

    const today = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(today.getDate() - 29);

    const fromDate = dateRange?.from || defaultFrom;
    const toDate = dateRange?.to || today;

    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(toDate);
    endDate.setHours(0, 0, 0, 0);

    if (endDate < startDate) {
      return { dailyCosts: [], dailyTokens: [], dailyTurns: [], modelNames: [] };
    }

    const dailyCostsData: any[] = [];
    const dailyTokensData: any[] = [];
    const dailyTurnsData: any[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toLocaleDateString('en-CA');
        const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayData = dataByDate.get(dateKey);

        const costEntry: Record<string, any> = { date: displayDate };
        const tokenEntry: Record<string, any> = { date: displayDate };
        const turnEntry: Record<string, any> = { date: displayDate };
        
        modelNames.forEach(modelName => {
            costEntry[modelName] = dayData?.costs[modelName] || 0;
            tokenEntry[modelName] = dayData?.tokens[modelName] || 0;
            turnEntry[modelName] = dayData?.turns[modelName] || 0;
        });

        dailyCostsData.push(costEntry);
        dailyTokensData.push(tokenEntry);
        dailyTurnsData.push(turnEntry);
    }
    
    return { dailyCosts: dailyCostsData, dailyTokens: dailyTokensData, dailyTurns: dailyTurnsData, modelNames };
  }, [allTurnsWithData, dateRange]);

  const renderChart = (title: string, data: any[], modelNames: string[], formatter: (val: number) => string, yAxisFormatter?: (val: any) => string) => (
    <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        {modelNames.map((model, i) => (
                        <linearGradient key={model} id={`color${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.1}/>
                        </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={yAxisFormatter} />
                    <Tooltip content={<CustomTooltip formatter={formatter} />} />
                    <Legend iconSize={10}/>
                    {modelNames.map((model, i) => (
                        <Area key={model} type="monotone" dataKey={model} stackId="1" stroke={COLORS[i % COLORS.length]} strokeWidth={2} fillOpacity={1} fill={`url(#color${i})`} />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">No data for this period.</div>
          )}
        </CardContent>
      </Card>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalConversations.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{totalMessages.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Today's Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{dailyMessages.toLocaleString()}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total Cost (Est.)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{formatCost(totalCost)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cost Today (Est.)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{formatCost(dailyCost)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cost This Month (Est.)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{formatCost(monthlyCost)}</p>
        </CardContent>
      </Card>
      
      {renderChart(
        'Daily Cost by Model (Est.)',
        dailyCosts,
        modelNames,
        formatChartCost,
        (val) => `$${Number(val).toFixed(2)}`
      )}

      {renderChart(
        'Daily Token Usage by Model (Est.)',
        dailyTokens,
        modelNames,
        (val) => `${formatToken(val)} tokens`,
        (val) => `${(Number(val) / 1000).toLocaleString()}k`
      )}

      {renderChart(
        'Daily Model Usage (Turns)',
        dailyTurns,
        modelNames,
        (val) => `${formatToken(val)} turns`,
        (val) => `${Number(val).toLocaleString()}`
      )}
    </div>
  )
}