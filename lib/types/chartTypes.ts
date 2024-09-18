// Define the structure for a single data point in a line chart
export interface LineChartDataPoint {
  x: number | string; // X-axis value (can be numeric or categorical)
  y: number; // Y-axis value
  series?: string; // Optional series name for multi-series line charts
}

// Define the structure for line chart data
export interface LineChartData {
  title: string;
  description: string;
  data: LineChartDataPoint[];
}

// You can add more chart types here in the future
export type ChartData = LineChartData;

// Define the possible chart types
export type ChartType = 'line' // Add more chart types here as needed