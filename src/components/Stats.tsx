"use client";

import {
  BookUser,
  BrainCircuit,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
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
import { format } from "date-fns";

interface StatsProps {
  logs: PromptLog[];
}

const models: Array<PromptLog["model"]> = [
  "GPT-4",
  "Claude 3",
  "Gemini 1.5",
  "Other",
];

export function Stats({ logs }: StatsProps) {
  const stats = useMemo(() => {
    const modelCounts = logs.reduce((acc, log) => {
      acc[log.model] = (acc[log.model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const barChartData = Object.entries(modelCounts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => a.count - b.count);

    const dailyUsage = logs.reduce((acc, log) => {
      const dateKey = format(log.timestamp, "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: format(log.timestamp, "MMM d"),
          fullDate: dateKey,
        };
        models.forEach((model) => {
          acc[dateKey][model] = 0;
        });
      }
      acc[dateKey][log.model] = (acc[dateKey][log.model] || 0) + 1;
      return acc;
    }, {} as Record<string, any>);

    const lineChartData = Object.values(dailyUsage).sort((a, b) =>
      a.fullDate.localeCompare(b.fullDate)
    );

    return { total: logs.length, barChartData, lineChartData };
  }, [logs]);

  const chartConfig = {
    count: {
      label: "Prompts",
      color: "hsl(var(--primary))",
    },
    "GPT-4": {
      label: "GPT-4",
      color: "hsl(var(--chart-1))",
    },
    "Claude 3": {
      label: "Claude 3",
      color: "hsl(var(--chart-2))",
    },
    "Gemini 1.5": {
      label: "Gemini 1.5",
      color: "hsl(var(--chart-3))",
    },
    Other: {
      label: "Other",
      color: "hsl(var(--chart-4))",
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-primary/20 shadow-lg shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-body">
              Total Prompts
            </CardTitle>
            <BookUser className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-headline">
              {stats.total}
            </div>
            <p className="text-xs text-muted-foreground">
              Cumulative prompts logged
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 shadow-lg shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-body">
              Prompts per Model
            </CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-2">
            {stats.barChartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[120px] w-full">
                <RechartsBarChart
                  accessibilityLayer
                  data={stats.barChartData}
                  layout="vertical"
                  margin={{ left: 10, top: 0, right: 10, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    width={80}
                  />
                  <XAxis dataKey="count" type="number" hide />
                  <ChartTooltip
                    cursor={{ fill: "hsl(var(--accent))" }}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={4}
                    barSize={20}
                  />
                </RechartsBarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[120px] items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  Log a prompt to see stats.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 shadow-lg shadow-primary/10">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <LineChartIcon className="h-6 w-6 text-primary" />
            Daily Model Usage
          </CardTitle>
          <CardDescription>
            Number of prompts logged per model each day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.lineChartData.length > 1 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <RechartsLineChart
                data={stats.lineChartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  allowDecimals={false}
                  width={30}
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--accent))" }}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Legend />
                {models.map((model) => (
                  <Line
                    key={model}
                    dataKey={model}
                    type="monotone"
                    stroke={(chartConfig as any)[model].color}
                    strokeWidth={2}
                    dot={true}
                  />
                ))}
              </RechartsLineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Log prompts for multiple days to see usage trends.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
