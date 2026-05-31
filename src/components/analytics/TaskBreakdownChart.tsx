"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { CheckCircle2, XCircle } from "lucide-react";
import type { MonthlyAnalytics } from "@/lib/supabase/analytics";

interface TaskBreakdownChartProps {
  analytics: MonthlyAnalytics;
}

export default function TaskBreakdownChart({ analytics }: TaskBreakdownChartProps) {
  const { completedTasks, missedTasks, totalTasks, taskCompletionRate } = analytics;

  const data = [
    { name: "Completed", value: completedTasks, color: "#ec4899" },
    { name: "Missed", value: missedTasks, color: "#fce7f3" },
  ];

  return (
    <div className="bg-white rounded-xl border border-pink-200 p-5 h-full">
      <h3 className="text-sm font-bold text-pink-700 mb-3">Task Breakdown</h3>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative w-28 h-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={48}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
                animationDuration={600}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-pink-600">{taskCompletionRate}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-pink-500 fill-pink-100" />
            <div>
              <p className="text-xs text-pink-400">Completed</p>
              <p className="text-xl font-bold text-pink-700">{completedTasks}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-pink-300" />
            <div>
              <p className="text-xs text-pink-400">Missed</p>
              <p className="text-xl font-bold text-pink-400">{missedTasks}</p>
            </div>
          </div>
          <div className="pt-1 border-t border-pink-100">
            <p className="text-[11px] text-pink-400">
              Total: <span className="font-semibold text-pink-600">{totalTasks}</span> tasks this month
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
