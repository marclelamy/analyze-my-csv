"use client"

import { TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { LineChartData } from '@/lib/types/chartTypes'

export function LineChart({ data }: { data: LineChartData }) {
  const seriesSet = new Set(data.data.map(point => point.series))
  const series = Array.from(seriesSet)

  const chartConfig = series.reduce((config, seriesName, index) => {
    config[seriesName || `series-${index}`] = {
      label: seriesName || `Series ${index + 1}`,
      color: `hsl(${index * 60}, 70%, 50%)`,
    }
    return config
  }, {} as Record<string, { label: string, color: string }>)

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
        <CardDescription>{data.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ChartContainer config={chartConfig}>
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart
              data={data.data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="x"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.toString().slice(0, 3)}
              />
              <YAxis axisLine={false} tickLine={false} />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              {series.map((seriesName, index) => (
                <Line
                  key={seriesName || `series-${index}`}
                  type="monotone"
                  dataKey="y"
                  data={data.data.filter(point => point.series === seriesName)}
                  name={seriesName || `Series ${index + 1}`}
                  stroke={chartConfig[seriesName || `series-${index}`].color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {/* <div className="flex gap-2 font-medium leading-none">
          Trending up <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing data for {series.length} series
        </div> */}
      </CardFooter>
    </Card>
  )
}