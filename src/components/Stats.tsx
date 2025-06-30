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
  type ChartConfig,
} from "@/components/ui/chart";
import type { PromptLog } from "@/lib/types";
import { useMemo } from "react";
import { format } from "date-fns";

interface StatsProps {
  logs: PromptLog[];
  models: string[];
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function Stats({ logs, models }: StatsProps) {
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      count: {
        label: "Prompts",
        color: "hsl(var(--primary))",
      },
    };
    models.forEach((model, index) => {
      config[model] = {
        label: model,
        color: chartColors[index % chartColors.length],
      };
    });
    return config;
  }, [models]);

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
      if(acc[dateKey][log.model] !== undefined) {
        acc[dateKey][log.model] = (acc[dateKey][log.model] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, any>);

    const lineChartData = Object.values(dailyUsage).sort((a, b) =>
      a.fullDate.localeCompare(b.fullDate)
    );

    return { total: logs.length, barChartData, lineChartData };
  }, [logs, models]);

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
              Cumulative prompts logged in selection
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
                    radius={4}
                    barSize={20}
                  >
                    {stats.barChartData.map((entry) => (
                      <rect key={entry.name} fill={chartConfig[entry.name]?.color} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[120px] items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  No data for this period.
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
                    stroke={chartConfig[model]?.color}
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
