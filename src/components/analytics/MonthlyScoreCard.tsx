"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Trophy } from "lucide-react";
import type { MonthlyAnalytics } from "@/lib/supabase/analytics";

interface MonthlyScoreCardProps {
  analytics: MonthlyAnalytics;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#16a34a";  // green
  if (score >= 60) return "#ec4899";  // pink
  if (score >= 40) return "#f59e0b";  // amber
  return "#ef4444";                    // red
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Outstanding!";
  if (score >= 80) return "Excellent!";
  if (score >= 70) return "Great Job!";
  if (score >= 60) return "Good Progress";
  if (score >= 50) return "Keep Going!";
  if (score >= 40) return "Room to Grow";
  return "Let's Improve!";
}

export default function MonthlyScoreCard({ analytics }: MonthlyScoreCardProps) {
  const { productivityScore, taskCompletionRate, habitCompletionRate, monthLabel } = analytics;

  const scoreColor = getScoreColor(productivityScore);
  const pieData = [
    { name: "Score", value: productivityScore },
    { name: "Remaining", value: 100 - productivityScore },
  ];

  return (
    <div className="bg-white rounded-xl border border-pink-200 p-5 h-full flex flex-col items-center">
      {/* Month Label */}
      <p className="text-[11px] font-medium text-pink-400 uppercase tracking-wider mb-1">
        {monthLabel}
      </p>

      {/* Big Score Donut */}
      <div className="relative w-36 h-36 my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={65}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
              animationDuration={1000}
            >
              <Cell fill={scoreColor} />
              <Cell fill="#fce7f3" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: scoreColor }}>
            {productivityScore}
          </span>
          <span className="text-[10px] text-pink-400 font-medium -mt-0.5">/ 100</span>
        </div>
      </div>

      {/* Score Label */}
      <div className="flex items-center gap-1.5 mb-3">
        <Trophy className="w-4 h-4" style={{ color: scoreColor }} />
        <p className="text-sm font-bold" style={{ color: scoreColor }}>
          {getScoreLabel(productivityScore)}
        </p>
      </div>

      {/* Breakdown */}
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-pink-500">Tasks</span>
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-pink-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-pink-400 transition-all duration-500"
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-pink-600 w-8 text-right">
              {taskCompletionRate}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-pink-500">Habits</span>
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-pink-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${habitCompletionRate}%`,
                  background: "linear-gradient(90deg, #f9a8d4, #ec4899)",
                }}
              />
            </div>
            <span className="text-[11px] font-semibold text-pink-600 w-8 text-right">
              {habitCompletionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Formula */}
      <p className="text-[9px] text-pink-300 mt-3">Score = Tasks × 60% + Habits × 40%</p>
    </div>
  );
}
