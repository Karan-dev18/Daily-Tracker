"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface OverallProgressChartProps {
  barData: number[]; // [Mon%, Tue%, ..., Sun%] or arbitrary buckets
  labels?: string[]; // optional custom x-axis labels (defaults to weekday names)
  title?: string;    // optional heading (defaults to "Overall Progress")
}

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function OverallProgressChart({ barData, labels, title }: OverallProgressChartProps) {
  const axisLabels = labels ?? dayLabels;
  const chartData = axisLabels.map((label, i) => ({
    day: label,
    value: barData[i] ?? 0,
  }));

  return (
    <div className="bg-white dark:bg-[#1e1b24] rounded-xl border border-pink-200 dark:border-pink-900/40 p-4 h-full">
      <h3 className="text-sm font-bold text-pink-700 dark:text-pink-300 text-center mb-2">
        {title ?? "Overall Progress"}
      </h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--donut-track, #fce7f3)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "#ec4899", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 10, fill: "#f9a8d4" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={600}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.value > 0 ? "url(#pinkBarGrad)" : "var(--donut-track, #fce7f3)"}
              />
            ))}
          </Bar>
          <defs>
            <linearGradient id="pinkBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
