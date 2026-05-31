"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import type { MonthlyAnalytics } from "@/lib/supabase/analytics";

interface DayPatternChartProps {
  analytics: MonthlyAnalytics;
}

export default function DayPatternChart({ analytics }: DayPatternChartProps) {
  const { dayOfWeekPattern } = analytics;

  return (
    <div className="bg-white rounded-xl border border-pink-200 p-5">
      <h3 className="text-sm font-bold text-pink-700 mb-3">Day-of-Week Patterns</h3>
      <p className="text-[10px] text-pink-400 mb-3 -mt-1">
        Which days are you most productive?
      </p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={dayOfWeekPattern} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
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
            name="Task Rate"
            fill="#db2777"
            radius={[3, 3, 0, 0]}
            maxBarSize={20}
            animationDuration={600}
          />
          <Bar
            dataKey="habitRate"
            name="Habit Rate"
            fill="#f9a8d4"
            radius={[3, 3, 0, 0]}
            maxBarSize={20}
            animationDuration={600}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Insight callout */}
      {dayOfWeekPattern.length > 0 && (() => {
        const sorted = [...dayOfWeekPattern].sort((a, b) => (b.taskRate + b.habitRate) - (a.taskRate + a.habitRate));
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        return (
          <p className="text-[10px] text-pink-500 mt-2 text-center">
            Strongest: <span className="font-bold text-pink-700">{best.day}</span>
            {" · "}
            Weakest: <span className="font-bold text-pink-700">{worst.day}</span>
          </p>
        );
      })()}
    </div>
  );
}
