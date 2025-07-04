'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from 'recharts'
import { Conversation, Model, Message } from '@/lib/types'
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
    const map = new Map<string, { inputCost: number; outputCost: number }>();
    models.forEach(model => {
      map.set(model.name, { inputCost: model.inputCost, outputCost: model.outputCost });
    });
    return map;
  }, [models]);

  const allMessages = useMemo(() => conversations.flatMap(c => c.messages), [conversations]);

  const calculateCost = (messages: Message[]) => {
    // This is a simplified calculation. A truly accurate one would need to know the model for each message.
    // We'll assume the first model in the list for this stat view for simplicity.
    const costs = models.length > 0 ? modelCostMap.get(models[0].name) : null;
    if (!costs) return 0;

    return messages.reduce((acc, msg) => {
      const inputCost = (msg.input_tokens || 0) / 1_000_000 * costs.inputCost;
      const outputCost = (msg.output_tokens || 0) / 1_000_000 * costs.outputCost;
      return acc + inputCost + outputCost;
    }, 0);
  };
  
  const totalConversations = conversations.length;
  const totalMessages = allMessages.length;
  const dailyMessages = allMessages.filter(m => new Date(m.timestamp) >= getStartOfToday()).length;
  
  const totalCost = useMemo(() => calculateCost(allMessages), [allMessages, modelCostMap]);
  const dailyCost = useMemo(() => calculateCost(allMessages.filter(p => new Date(p.timestamp) >= getStartOfToday())), [allMessages, modelCostMap]);
  const monthlyCost = useMemo(() => calculateCost(allMessages.filter(p => new Date(p.timestamp) >= getStartOfMonth())), [allMessages, modelCostMap]);


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
