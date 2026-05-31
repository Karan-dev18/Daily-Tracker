"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip, Legend,
} from "recharts";
import type { MonthlyAnalytics } from "@/lib/supabase/analytics";

interface WeeklyBreakdownChartProps {
  analytics: MonthlyAnalytics;
}

export default function WeeklyBreakdownChart({ analytics }: WeeklyBreakdownChartProps) {
  const { weeklyBreakdown } = analytics;

  return (
    <div className="bg-white rounded-xl border border-pink-200 p-5 h-full">
      <h3 className="text-sm font-bold text-pink-700 mb-3">Weekly Performance</h3>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={weeklyBreakdown} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
          <XAxis
            dataKey="weekLabel"
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
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: "white",
              border: "1px solid #fbcfe8",
              borderRadius: "8px",
              fontSize: "11px",
            }}
            formatter={(value: unknown, name: unknown) => [`${value}%`, `${name}`]}
          />
          <Legend
            wrapperStyle={{ fontSize: "10px", paddingTop: "4px" }}
            iconSize={8}
          />
          <Bar
            dataKey="taskRate"
            name="Tasks"
            fill="#ec4899"
            radius={[3, 3, 0, 0]}
            maxBarSize={24}
            animationDuration={600}
          />
          <Bar
            dataKey="habitRate"
            name="Habits"
            fill="#f9a8d4"
            radius={[3, 3, 0, 0]}
            maxBarSize={24}
            animationDuration={600}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
