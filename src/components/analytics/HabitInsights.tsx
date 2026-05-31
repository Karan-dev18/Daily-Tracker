"use client";

import { TrendingUp, TrendingDown, AlertTriangle, Star, Sun, Briefcase } from "lucide-react";
import type { MonthlyAnalytics, HabitPerformance } from "@/lib/supabase/analytics";

interface HabitInsightsProps {
  analytics: MonthlyAnalytics;
}

function getHabitIcon(rate: number) {
  if (rate >= 80) return <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-200" />;
  if (rate >= 50) return <TrendingUp className="w-3.5 h-3.5 text-pink-400" />;
  return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
}

function getBarColor(rate: number): string {
  if (rate >= 80) return "linear-gradient(90deg, #fbbf24, #f59e0b)";
  if (rate >= 60) return "linear-gradient(90deg, #f9a8d4, #ec4899)";
  if (rate >= 40) return "linear-gradient(90deg, #fdba74, #f97316)";
  return "linear-gradient(90deg, #fca5a5, #ef4444)";
}

function HabitRow({ habit }: { habit: HabitPerformance }) {
  const weekendDrop = habit.weekdayRate - habit.weekendRate;
  const hasWeekendIssue = weekendDrop > 20;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-pink-50/50 transition-colors">
      {/* Icon */}
      {getHabitIcon(habit.completionRate)}

      {/* Name */}
      <span className="text-[11px] font-medium text-pink-700 w-28 shrink-0 truncate">
        {habit.name}
      </span>

      {/* Progress bar */}
      <div className="flex-1 h-2 bg-pink-50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${habit.completionRate}%`,
            background: getBarColor(habit.completionRate),
          }}
        />
      </div>

      {/* Rate */}
      <span className="text-[11px] font-bold text-pink-600 w-9 text-right">
        {habit.completionRate}%
      </span>

      {/* Weekday / Weekend split */}
      <div className="hidden sm:flex items-center gap-1 w-24 shrink-0">
        <div className="flex items-center gap-0.5" title="Weekday rate">
          <Briefcase className="w-3 h-3 text-pink-300" />
          <span className="text-[10px] text-pink-500">{habit.weekdayRate}%</span>
        </div>
        <span className="text-pink-200">|</span>
        <div className="flex items-center gap-0.5" title="Weekend rate">
          <Sun className={`w-3 h-3 ${hasWeekendIssue ? "text-orange-400" : "text-pink-300"}`} />
          <span className={`text-[10px] ${hasWeekendIssue ? "text-orange-500 font-semibold" : "text-pink-500"}`}>
            {habit.weekendRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HabitInsights({ analytics }: HabitInsightsProps) {
  const { topHabits, weakHabits } = analytics;

  // Find habits with significant weekend drops
  const weekendIssues = [...topHabits, ...weakHabits].filter(
    (h) => h.weekdayRate - h.weekendRate > 20
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ─── Top Performing ─── */}
      <div className="bg-white rounded-xl border border-pink-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <h3 className="text-sm font-bold text-pink-700">Top Performing Habits</h3>
        </div>
        <div className="space-y-0.5">
          {topHabits.length > 0 ? (
            topHabits.map((h) => <HabitRow key={h.name} habit={h} />)
          ) : (
            <p className="text-xs text-pink-300 py-4 text-center">No habit data yet</p>
          )}
        </div>
      </div>

      {/* ─── Needs Improvement ─── */}
      <div className="bg-white rounded-xl border border-pink-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-pink-700">Habits to Improve</h3>
        </div>
        <div className="space-y-0.5">
          {weakHabits.length > 0 ? (
            weakHabits.map((h) => <HabitRow key={h.name} habit={h} />)
          ) : (
            <p className="text-xs text-pink-300 py-4 text-center">No habit data yet</p>
          )}
        </div>

        {/* Weekend insight callout */}
        {weekendIssues.length > 0 && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Sun className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-orange-700 mb-1">Weekend Pattern Detected</p>
                <p className="text-[10px] text-orange-600 leading-relaxed">
                  {weekendIssues.map((h) => `"${h.name}"`).join(", ")}{" "}
                  {weekendIssues.length === 1 ? "drops" : "drop"} significantly on weekends.
                  Consider adjusting your schedule or setting weekend-specific reminders.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
