"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  fetchMonthlyAnalytics,
  fetchYearlyOverview,
  generateDemoAnalytics,
  generateDemoYearlyOverview,
} from "@/lib/supabase/analytics";
import type { MonthlyAnalytics } from "@/lib/supabase/analytics";
import MonthlyScoreCard from "./MonthlyScoreCard";
import TaskBreakdownChart from "./TaskBreakdownChart";
import HabitInsights from "./HabitInsights";
import DayPatternChart from "./DayPatternChart";
import WeeklyBreakdownChart from "./WeeklyBreakdownChart";
import YearlyTrendChart from "./YearlyTrendChart";

interface AnalyticsClientProps {
  userId?: string | null;
}

function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthYear: string, delta: number): string {
  const [y, m] = monthYear.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthShort(monthYear: string): string {
  const [y, m] = monthYear.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function AnalyticsClient({ userId }: AnalyticsClientProps) {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonthYear());
  const [analytics, setAnalytics] = useState<MonthlyAnalytics | null>(null);
  const [yearlyData, setYearlyData] = useState<{ month: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const isPreview = !userId;
  const loadedRef = useRef<string>("");

  // ─── Load analytics data ───
  const loadAnalytics = useCallback(
    async (monthYear: string) => {
      if (loadedRef.current === monthYear) return;
      loadedRef.current = monthYear;
      setLoading(true);

      try {
        if (isPreview) {
          // Simulate network delay for realism
          await new Promise((r) => setTimeout(r, 300));
          const data = generateDemoAnalytics(monthYear);
          setAnalytics(data);
        } else {
          const data = await fetchMonthlyAnalytics(userId!, monthYear);
          setAnalytics(data);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    },
    [userId, isPreview]
  );

  // ─── Load yearly overview ───
  const loadYearly = useCallback(
    async (yr: number) => {
      try {
        if (isPreview) {
          setYearlyData(generateDemoYearlyOverview(yr));
        } else {
          const data = await fetchYearlyOverview(userId!, yr);
          setYearlyData(data);
        }
      } catch (err) {
        console.error("Failed to load yearly data:", err);
      }
    },
    [userId, isPreview]
  );

  useEffect(() => {
    loadAnalytics(currentMonth);
  }, [currentMonth, loadAnalytics]);

  useEffect(() => {
    loadYearly(year);
  }, [year, loadYearly]);

  // ─── Month Navigation ───
  const goToPrevMonth = () => {
    loadedRef.current = "";
    const prev = shiftMonth(currentMonth, -1);
    setCurrentMonth(prev);
    const [y] = prev.split("-").map(Number);
    if (y !== year) setYear(y);
  };

  const goToNextMonth = () => {
    const next = shiftMonth(currentMonth, 1);
    if (next > getCurrentMonthYear()) return; // Can't go to future
    loadedRef.current = "";
    setCurrentMonth(next);
    const [y] = next.split("-").map(Number);
    if (y !== year) setYear(y);
  };

  const isCurrentMonth = currentMonth === getCurrentMonthYear();

  // ─── Loading State ───
  if (loading || !analytics) {
    return (
      <div className="max-w-[1440px] mx-auto px-3 lg:px-5 py-8">
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            <p className="text-sm text-pink-400 font-medium">Crunching your numbers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 lg:px-5 py-5 space-y-5">

      {/* ─── Header: Back + Month Navigator ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={isPreview ? "/preview" : "/dashboard"}
            className="flex items-center gap-1.5 text-sm text-pink-500 hover:text-pink-700 transition-colors bg-white border border-pink-200 rounded-lg px-3 py-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-pink-400" />
            <h1 className="text-lg font-bold text-pink-700">Yearly Analytics</h1>
          </div>
        </div>

        {/* Month Picker */}
        <div className="flex items-center gap-2 bg-white border border-pink-200 rounded-xl px-2 py-1">
          <button
            onClick={goToPrevMonth}
            className="w-7 h-7 rounded-lg hover:bg-pink-50 flex items-center justify-center transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 text-pink-500" />
          </button>
          <span className="text-sm font-semibold text-pink-700 w-40 text-center">
            {formatMonthShort(currentMonth)}
          </span>
          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isCurrentMonth
                ? "text-pink-200 cursor-not-allowed"
                : "hover:bg-pink-50 text-pink-500"
            }`}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Row 1: Score + Task Breakdown + Weekly Breakdown ─── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3">
          <MonthlyScoreCard analytics={analytics} />
        </div>
        <div className="md:col-span-4">
          <TaskBreakdownChart analytics={analytics} />
        </div>
        <div className="md:col-span-5">
          <WeeklyBreakdownChart analytics={analytics} />
        </div>
      </div>

      {/* ─── Row 2: Habit Insights ─── */}
      <HabitInsights analytics={analytics} />

      {/* ─── Row 3: Day Pattern + Yearly Trend ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DayPatternChart analytics={analytics} />
        <YearlyTrendChart
          yearlyData={yearlyData}
          year={year}
          onYearChange={setYear}
          currentMonth={currentMonth}
          onMonthClick={(m) => {
            loadedRef.current = "";
            setCurrentMonth(m);
          }}
        />
      </div>
    </div>
  );
}
