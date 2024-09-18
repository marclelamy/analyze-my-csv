"use client"

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChartData } from '@/lib/types/chartTypes';

export function LineChart({ data }: { data: LineChartData }) {
  const seriesSet = new Set(data.data.map(point => point.series));
  const series = Array.from(seriesSet);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
        <CardDescription>{data.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RechartsLineChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <Tooltip />
            <Legend />
            {series.map((seriesName, index) => (
              <Line 
                key={seriesName || `series-${index}`}
                type="monotone" 
                dataKey="y" 
                name={seriesName || `Series ${index + 1}`}
                stroke={`hsl(${index * 60}, 70%, 50%)`} 
                activeDot={{ r: 8 }}
                data={data.data.filter(point => point.series === seriesName)}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}