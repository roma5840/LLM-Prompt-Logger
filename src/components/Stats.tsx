"use client";

import { BookUser, BrainCircuit } from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { PromptLog } from "@/lib/types";
import { useMemo } from "react";

interface StatsProps {
  logs: PromptLog[];
}

export function Stats({ logs }: StatsProps) {
  const stats = useMemo(() => {
    const modelCounts = logs.reduce((acc, log) => {
      acc[log.model] = (acc[log.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(modelCounts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => a.count - b.count);

    return { total: logs.length, chartData };
  }, [logs]);

  const chartConfig = {
    count: {
      label: "Prompts",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Card className="border-primary/20 shadow-lg shadow-primary/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium font-body">Total Prompts</CardTitle>
          <BookUser className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold font-headline">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            Cumulative prompts logged
          </p>
        </CardContent>
      </Card>
      <Card className="border-primary/20 shadow-lg shadow-primary/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium font-body">Prompts per Model</CardTitle>
          <BrainCircuit className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pb-2">
          {stats.chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[120px] w-full">
              <RechartsBarChart
                accessibilityLayer
                data={stats.chartData}
                layout="vertical"
                margin={{ left: 10, top: 0, right: 10, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  width={80}
                />
                <XAxis dataKey="count" type="number" hide />
                <ChartTooltip
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={20} />
              </RechartsBarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[120px] items-center justify-center">
              <p className="text-muted-foreground text-sm">Log a prompt to see stats.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
