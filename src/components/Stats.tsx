'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from 'recharts'
import { Conversation, Model, Turn } from '@/lib/types'
import { useMemo } from 'react'

interface StatsProps {
  conversations: Conversation[]
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
          {label}: <span className="font-bold text-muted-foreground">{payload[0].value.toLocaleString()} messages</span>
        </p>
      </div>
    );
  }
  return null;
};

const formatCost = (cost: number) => {
    if (cost < 0.0001 && cost > 0) return "<$0.0001";
    return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
};

export function Stats({ conversations, models }: StatsProps) {
  const modelCostMap = useMemo(() => {
    const map = new Map<string, Model>();
    models.forEach(model => {
      map.set(model.name, model);
    });
    return map;
  }, [models]);

  const allMessages = useMemo(() => conversations.flatMap(c => c.messages), [conversations]);

  const allTurnsWithCosts = useMemo(() => {
    const turnsWithCosts: (Turn & { cost: number })[] = [];
    conversations.forEach(convo => {
      let cumulativeInputTokens = 0;
      let cumulativeOutputTokens = 0;
      convo.messages.forEach(turn => {
        const model = modelCostMap.get(turn.model);
        if (!model) {
          turnsWithCosts.push({ ...turn, cost: 0 });
          return;
        }
        
        let turnCost = 0;
        const contextTokens = cumulativeInputTokens + cumulativeOutputTokens;
        
        // Context cost
        if (contextTokens > 0) {
          const contextCostPerToken = (model.isCacheEnabled ? model.cachedInputCost : model.inputCost) / 1_000_000;
          turnCost += contextTokens * contextCostPerToken;
        }

        // Turn I/O cost
        const turnInputTokens = turn.input_tokens || 0;
        const turnOutputTokens = turn.output_tokens || 0;
        turnCost += turnInputTokens * (model.inputCost / 1_000_000);
        turnCost += turnOutputTokens * (model.outputCost / 1_000_000);

        turnsWithCosts.push({ ...turn, cost: turnCost });

        // Update cumulative tokens for the next turn in this convo
        cumulativeInputTokens += turnInputTokens;
        cumulativeOutputTokens += turnOutputTokens;
      });
    });
    return turnsWithCosts;
  }, [conversations, modelCostMap]);
  
  const totalConversations = conversations.length;
  const totalMessages = allMessages.length;
  const dailyMessages = allMessages.filter(m => new Date(m.timestamp) >= getStartOfToday()).length;
  
  const totalCost = useMemo(() => allTurnsWithCosts.reduce((sum, turn) => sum + turn.cost, 0), [allTurnsWithCosts]);
  const dailyCost = useMemo(() => allTurnsWithCosts.filter(t => new Date(t.timestamp) >= getStartOfToday()).reduce((sum, turn) => sum + turn.cost, 0), [allTurnsWithCosts]);
  const monthlyCost = useMemo(() => allTurnsWithCosts.filter(t => new Date(t.timestamp) >= getStartOfMonth()).reduce((sum, turn) => sum + turn.cost, 0), [allTurnsWithCosts]);


  const dailyUsage = useMemo(() => {
    const messageCountsByDate = new Map<string, number>();
    allMessages.forEach(message => {
      const dateKey = new Date(message.timestamp).toLocaleDateString('en-CA'); 
      const currentCount = messageCountsByDate.get(dateKey) || 0;
      messageCountsByDate.set(dateKey, currentCount + 1);
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
      return {
        date: displayDate,
        messages: messageCountsByDate.get(dateKey) || 0
      };
    });
  }, [allMessages]);

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
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Daily Usage (Messages)</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyUsage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="messages" stroke={COLORS[0]} dot={false} strokeWidth={2} />
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