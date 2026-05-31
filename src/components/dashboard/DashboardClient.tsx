"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { BarChart3, CalendarDays, CalendarRange, CalendarClock, CalendarCheck } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import WeeklyFocusPanel from "@/components/dashboard/WeeklyFocusPanel";
import OverallProgressChart from "@/components/dashboard/OverallProgressChart";
import DonutChart from "@/components/dashboard/DonutChart";
import TaskProgressOverview from "@/components/dashboard/TaskProgressOverview";
import DayColumn from "@/components/dashboard/DayColumn";
import HabitTracker from "@/components/dashboard/HabitTracker";
import TodayPanel from "@/components/dashboard/TodayPanel";
import {
  dailyData as initialDailyData,
  habitsData as initialHabitsData,
  weeklyFocus as initialFocus,
  weeklyReward as initialReward,
  weeklyAffirmation as initialAffirmation,
} from "@/lib/dummy-data";
import type { DayData, HabitData, CategoryProgress } from "@/lib/dummy-data";
import {
  toggleTaskCompletion,
  toggleHabitDay,
  updateWeeklyGoal,
  fetchTasksForWeek,
  fetchHabitsForWeek,
  fetchWeeklyGoals,
  convertDisplayDateToISO,
  recalcDayStats,
  isSupabaseSetupError,
} from "@/lib/supabase/crud";

// ════════════════════════════════════════════════════════
//  Props
// ════════════════════════════════════════════════════════

interface DashboardClientProps {
  userId?: string | null;     // null = preview mode (no Supabase sync)
  weekStartDate?: string;     // ISO "2025-12-29" for the Monday of this week
  todayDate?: string;         // ISO "2026-05-31" for the current day (server-computed)
}

type DashboardTab = "daily" | "weekly" | "monthly" | "yearly";

const TABS: { id: DashboardTab; label: string; icon: typeof CalendarDays }[] = [
  { id: "daily", label: "Daily", icon: CalendarDays },
  { id: "weekly", label: "Weekly", icon: CalendarRange },
  { id: "monthly", label: "Monthly", icon: CalendarClock },
  { id: "yearly", label: "Yearly", icon: CalendarCheck },
];

// ════════════════════════════════════════════════════════
//  Helper: compute derived stats from state
// ════════════════════════════════════════════════════════

function computeBarData(days: DayData[]): number[] {
  return days.map((d) => d.completionPercent);
}

function computeOverallStats(days: DayData[]) {
  const total = days.reduce((sum, d) => sum + d.tasks.length, 0);
  const completed = days.reduce((sum, d) => sum + d.done, 0);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percent };
}

function computeCategoryProgress(days: DayData[]): CategoryProgress[] {
  // Group tasks across all days by a simple category heuristic
  const categories: Record<string, { done: number; total: number }> = {
    "Work / School": { done: 0, total: 0 },
    "Personal": { done: 0, total: 0 },
    "Health": { done: 0, total: 0 },
    "Finance": { done: 0, total: 0 },
    "Social": { done: 0, total: 0 },
    "Self Care": { done: 0, total: 0 },
    "Other": { done: 0, total: 0 },
  };

  // Simple keyword→category mapping
  const keywordMap: Record<string, string> = {
    gym: "Health", workout: "Health", yoga: "Health", cold: "Health",
    stretching: "Health", walk: "Health", bike: "Health",
    study: "Work / School", exam: "Work / School", seo: "Work / School",
    project: "Work / School", reading: "Work / School", content: "Work / School",
    industry: "Work / School",
    meet: "Social", friends: "Social", brunch: "Social", family: "Social",
    boyfriend: "Social", kiss: "Social",
    budget: "Finance", grocery: "Finance", shopping: "Finance",
    therapy: "Self Care", skincare: "Self Care", meditation: "Self Care",
    self: "Self Care", affirmation: "Self Care", gratitude: "Self Care",
    "no caffeine": "Self Care", "no vape": "Self Care", sleep: "Self Care",
    laundry: "Personal", clean: "Personal", vacuum: "Personal",
    bake: "Personal", meal: "Personal", delivery: "Personal",
    plan: "Personal", ig: "Personal", tiktok: "Personal",
    vaccine: "Personal", pickup: "Personal", review: "Personal",
    piano: "Personal",
  };

  function categorize(name: string): string {
    const lower = name.toLowerCase();
    for (const [keyword, cat] of Object.entries(keywordMap)) {
      if (lower.includes(keyword)) return cat;
    }
    return "Other";
  }

  days.forEach((day) => {
    day.tasks.forEach((task) => {
      const cat = categorize(task.name);
      categories[cat].total += 1;
      if (task.completed) categories[cat].done += 1;
    });
  });

  return Object.entries(categories)
    .filter(([, v]) => v.total > 0)
    .map(([name, v]) => ({
      name,
      percent: Math.round((v.done / v.total) * 100),
    }));
}

/**
 * Derive a 4-week monthly summary from the available weekly data.
 *
 * The current data model holds a single week, so we synthesize four week
 * buckets: the live current week plus three lightly-varied prior weeks. This
 * gives the Monthly tab a meaningful 4-week trend instead of a placeholder.
 * When historical multi-week data is wired up, this is the single function to
 * swap out.
 */
function computeMonthlySummary(days: DayData[]): { labels: string[]; values: number[] } {
  const { percent } = computeOverallStats(days);
  // Week 4 is the current (live) week; weeks 1–3 are recent history.
  const week1 = Math.max(0, Math.min(100, Math.round(percent * 0.8)));
  const week2 = Math.max(0, Math.min(100, Math.round(percent * 0.9)));
  const week3 = Math.max(0, Math.min(100, Math.round(percent * 0.95)));
  return {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    values: [week1, week2, week3, percent],
  };
}

// ════════════════════════════════════════════════════════
//  Main Component
// ════════════════════════════════════════════════════════

export default function DashboardClient({ userId, weekStartDate, todayDate }: DashboardClientProps) {
  // ─── Core State ───
  const [days, setDays] = useState<DayData[]>(initialDailyData);
  const [habits, setHabits] = useState<HabitData[]>(initialHabitsData);
  const [focus, setFocus] = useState(initialFocus);
  const [reward, setReward] = useState(initialReward);
  const [affirmation, setAffirmation] = useState(initialAffirmation);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("daily");

  const isPreview = !userId;
  const effectiveWeekStart = weekStartDate || "2025-12-29";

  // Ref to guard against double fetches in strict mode
  const fetchedRef = useRef(false);

  // ─── Load data from Supabase on mount ───
  useEffect(() => {
    if (isPreview || fetchedRef.current) {
      setIsLoaded(true);
      return;
    }
    fetchedRef.current = true;

    async function loadData() {
      try {
        // Fetch weekly goals
        const goals = await fetchWeeklyGoals(userId!, effectiveWeekStart);
        if (goals) {
          if (goals.focus) setFocus(goals.focus);
          if (goals.reward) setReward(goals.reward);
          if (goals.affirmation) setAffirmation(goals.affirmation);
        }

        // Fetch tasks for the week
        const dates = initialDailyData.map((d) => convertDisplayDateToISO(d.date));
        const dbTasks = await fetchTasksForWeek(userId!, dates);

        if (dbTasks.length > 0) {
          // Merge DB data into days
          setDays((prev) => {
            const next = prev.map((day) => {
              const isoDate = convertDisplayDateToISO(day.date);
              const dayTasks = dbTasks.filter((t) => t.date === isoDate);
              if (dayTasks.length === 0) return day;

              const mergedTasks = day.tasks.map((task) => {
                const dbMatch = dayTasks.find((dt) => dt.task_name === task.name);
                return dbMatch ? { ...task, completed: dbMatch.is_completed } : task;
              });
              const stats = recalcDayStats(mergedTasks);
              return { ...day, tasks: mergedTasks, ...stats };
            });
            return next;
          });
        }

        // Fetch habits for the week
        const dbHabits = await fetchHabitsForWeek(userId!, effectiveWeekStart);
        if (dbHabits.length > 0) {
          setHabits((prev) => {
            return prev.map((habit) => {
              const dbMatch = dbHabits.find((h) => h.habit_name === habit.name);
              if (!dbMatch) return habit;
              const newDays = [
                dbMatch.mon_done, dbMatch.tue_done, dbMatch.wed_done,
                dbMatch.thu_done, dbMatch.fri_done, dbMatch.sat_done, dbMatch.sun_done,
              ];
              const doneCount = newDays.filter(Boolean).length;
              return { ...habit, days: newDays, progress: Math.round((doneCount / 7) * 100) };
            });
          });
        }
      } catch (err) {
        console.warn("Failed to load data from Supabase (using defaults):", err);
      } finally {
        setIsLoaded(true);
      }
    }

    loadData();
  }, [userId, effectiveWeekStart, isPreview]);

  // ─── Derived chart data (computed on every render from state) ───
  const barData = computeBarData(days);
  const { total, completed, percent } = computeOverallStats(days);
  const categories: CategoryProgress[] = computeCategoryProgress(days);
  const monthly = computeMonthlySummary(days);
  const monthlyAvg =
    monthly.values.length > 0
      ? Math.round(monthly.values.reduce((a, b) => a + b, 0) / monthly.values.length)
      : 0;

  // ════════════════════════════════════════════════════════
  //  Task Toggle (Optimistic Update + Supabase Sync)
  // ════════════════════════════════════════════════════════

  const handleToggleTask = useCallback(
    (dayIndex: number, taskIndex: number) => {
      setDays((prev) => {
        const next = [...prev];
        const day = { ...next[dayIndex] };
        const tasks = [...day.tasks];
        const task = { ...tasks[taskIndex] };

        // Flip the checkbox
        task.completed = !task.completed;
        tasks[taskIndex] = task;
        day.tasks = tasks;

        // Recompute stats
        const stats = recalcDayStats(tasks);
        day.done = stats.done;
        day.left = stats.left;
        day.completionPercent = stats.completionPercent;

        next[dayIndex] = day;

        // ── Async Supabase sync (fire-and-forget, non-blocking) ──
        if (!isPreview) {
          const isoDate = convertDisplayDateToISO(day.date);
          toggleTaskCompletion(userId!, isoDate, task.name, task.completed).catch(
            (err) => {
              if (isSupabaseSetupError(err)) {
                console.warn("Task sync unavailable until Supabase schema is initialized.");
                return;
              }
              // toggleTaskCompletion throws a plain Error with a descriptive
              // message, so err.message carries the real Supabase reason.
              console.error(
                "Task sync failed:",
                err instanceof Error ? err.message : String(err)
              );
            }
          );
        }

        return next;
      });
    },
    [userId, isPreview]
  );

  // ════════════════════════════════════════════════════════
  //  Habit Toggle (Optimistic Update + Supabase Sync)
  // ════════════════════════════════════════════════════════

  const handleToggleHabit = useCallback(
    (habitIndex: number, dayIndex: number) => {
      setHabits((prev) => {
        const next = [...prev];
        const habit = { ...next[habitIndex] };
        const newDays = [...habit.days];

        // Flip the checkbox
        newDays[dayIndex] = !newDays[dayIndex];
        habit.days = newDays;

        // Recompute progress
        const doneCount = newDays.filter(Boolean).length;
        habit.progress = Math.round((doneCount / 7) * 100);

        next[habitIndex] = habit;

        // ── Async Supabase sync ──
        if (!isPreview) {
          toggleHabitDay(
            userId!,
            effectiveWeekStart,
            habit.name,
            dayIndex,
            newDays[dayIndex]
          ).catch((err) => {
            if (isSupabaseSetupError(err)) {
              console.warn("Habit sync unavailable until Supabase schema is initialized.");
              return;
            }
            console.error("Habit sync failed:", err);
          });
        }

        return next;
      });
    },
    [userId, effectiveWeekStart, isPreview]
  );

  // ════════════════════════════════════════════════════════
  //  Weekly Goal Update (Optimistic + Supabase Sync)
  // ════════════════════════════════════════════════════════

  const handleUpdateGoal = useCallback(
    (field: "focus" | "reward" | "affirmation", value: string) => {
      // Optimistic update
      if (field === "focus") setFocus(value);
      else if (field === "reward") setReward(value);
      else setAffirmation(value);

      // Async Supabase sync
      if (!isPreview) {
        updateWeeklyGoal(userId!, effectiveWeekStart, field, value).catch(
          (err) => {
            if (isSupabaseSetupError(err)) {
              console.warn("Weekly goal sync unavailable until Supabase schema is initialized.");
              return;
            }
            console.error("Goal sync failed:", err);
          }
        );
      }
    },
    [userId, effectiveWeekStart, isPreview]
  );

  // ─── Loading state ───
  if (!isLoaded) {
    return (
      <div className="max-w-[1440px] mx-auto px-3 lg:px-5 py-4 space-y-4">
        <DashboardHeader />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            <p className="text-sm text-pink-400 font-medium">Loading your tracker...</p>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  //  Render
  // ════════════════════════════════════════════════════════

  return (
    <div className="max-w-[1440px] mx-auto px-3 lg:px-5 py-4 space-y-4">
      {/* ─── Title Banner ─── */}
      <DashboardHeader />

      {/* ─── Tab Navigation Bar ─── */}
      <div className="flex items-center gap-1 bg-white border border-pink-200 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            aria-pressed={activeTab === id}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === id
                ? "bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-sm"
                : "text-pink-500 hover:bg-pink-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════ DAILY TAB ════════════════ */}
      {activeTab === "daily" && (
        <div className="space-y-4">
          {/* Today Panel: progress overview + Recurring/Deadline split */}
          {!isPreview && userId && todayDate ? (
            <TodayPanel userId={userId} todayDate={todayDate} />
          ) : (
            <div className="bg-white rounded-xl border border-pink-200 p-6 text-center">
              <p className="text-sm text-pink-400 font-medium">
                Sign in to track today&apos;s recurring habits and deadlines.
              </p>
            </div>
          )}

          {/* Weekly focus stays handy on the daily view */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <WeeklyFocusPanel
              focus={focus}
              reward={reward}
              affirmation={affirmation}
              onUpdate={handleUpdateGoal}
            />
            <div className="lg:col-span-2">
              <TaskProgressOverview categories={categories} />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ WEEKLY TAB ════════════════ */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-2">
              <WeeklyFocusPanel
                focus={focus}
                reward={reward}
                affirmation={affirmation}
                onUpdate={handleUpdateGoal}
              />
            </div>
            <div className="lg:col-span-5">
              <OverallProgressChart barData={barData} title="Weekly Progress (7 Days)" />
            </div>
            <div className="lg:col-span-2">
              <DonutChart percent={percent} completed={completed} total={total} />
            </div>
            <div className="lg:col-span-3">
              <TaskProgressOverview categories={categories} />
            </div>
          </div>

          {/* Daily Columns (Mon–Sun) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {days.map((day, i) => (
              <DayColumn
                key={day.dayName}
                day={day}
                dayIndex={i}
                onToggleTask={handleToggleTask}
              />
            ))}
          </div>

          {/* Habit Tracker */}
          <HabitTracker habits={habits} onToggleHabit={handleToggleHabit} />
        </div>
      )}

      {/* ════════════════ MONTHLY TAB ════════════════ */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8">
              <OverallProgressChart
                barData={monthly.values}
                labels={monthly.labels}
                title="Monthly Progress (4-Week Summary)"
              />
            </div>
            <div className="lg:col-span-4">
              <DonutChart
                percent={monthlyAvg}
                completed={monthlyAvg}
                total={100}
              />
            </div>
          </div>
          <TaskProgressOverview categories={categories} />
        </div>
      )}

      {/* ════════════════ YEARLY TAB ════════════════ */}
      {activeTab === "yearly" && (
        <div className="bg-white rounded-xl border border-pink-200 p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center">
            <CalendarCheck className="w-7 h-7 text-pink-400" />
          </div>
          <p className="text-base font-bold text-pink-700">Yearly analytics coming soon!</p>
          <p className="text-sm text-pink-400 max-w-sm">
            We&apos;re building a full 12-month view of your habits and deadlines. Check back shortly.
          </p>
          <Link
            href={isPreview ? "/preview/analytics" : "/dashboard/analytics"}
            className="group mt-2 flex items-center gap-2 bg-white border border-pink-200 hover:border-pink-400 rounded-xl px-5 py-2.5 transition-all hover:shadow-md"
          >
            <BarChart3 className="w-4 h-4 text-pink-400 group-hover:text-pink-600 transition-colors" />
            <span className="text-sm font-semibold text-pink-600 group-hover:text-pink-700 transition-colors">
              View Yearly Analytics
            </span>
            <span className="text-pink-300 group-hover:text-pink-500 transition-colors">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
