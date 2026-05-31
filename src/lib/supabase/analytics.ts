import { createClient } from "./client";

// ════════════════════════════════════════════════════════
//  Types for Analytics
// ════════════════════════════════════════════════════════

export interface MonthlyAnalytics {
  monthYear: string;           // "2026-01"
  monthLabel: string;          // "January 2026"
  productivityScore: number;   // 0–100
  totalTasks: number;
  completedTasks: number;
  missedTasks: number;
  taskCompletionRate: number;  // 0–100
  totalHabitSlots: number;     // habits × 7 days per week × weeks in month
  completedHabitSlots: number;
  habitCompletionRate: number; // 0–100
  topHabits: HabitPerformance[];
  weakHabits: HabitPerformance[];
  dayOfWeekPattern: DayOfWeekPattern[];
  weeklyBreakdown: WeeklyBreakdown[];
}

export interface HabitPerformance {
  name: string;
  completionRate: number;      // 0–100
  totalSlots: number;
  completedSlots: number;
  weekdayRate: number;         // Mon–Fri rate
  weekendRate: number;         // Sat–Sun rate
  trend: "improving" | "declining" | "steady";
}

export interface DayOfWeekPattern {
  day: string;                 // "Mon", "Tue", etc.
  taskRate: number;            // 0–100
  habitRate: number;           // 0–100
}

export interface WeeklyBreakdown {
  weekLabel: string;           // "Week 1", "Week 2", etc.
  weekStart: string;           // ISO date
  taskRate: number;
  habitRate: number;
  score: number;               // combined 0–100
}

// ════════════════════════════════════════════════════════
//  Fetch Monthly Analytics from Supabase
// ════════════════════════════════════════════════════════

function getClient() {
  return createClient();
}

/**
 * Get the date range for a given month.
 */
function getMonthRange(monthYear: string): { start: string; end: string } {
  const [year, month] = monthYear.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/**
 * Get all Monday dates (week_start_date) that fall within or overlap a given month.
 */
function getWeekStartsForMonth(monthYear: string): string[] {
  const [year, month] = monthYear.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // Find the Monday on or before the first day of the month
  const startDate = new Date(firstDay);
  const dayOfWeek = startDate.getDay();
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + offset);

  const weekStarts: string[] = [];
  const current = new Date(startDate);

  while (current <= lastDay) {
    weekStarts.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 7);
  }

  return weekStarts;
}

/**
 * Format month label from "2026-01" to "January 2026".
 */
function formatMonthLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HABIT_DAY_KEYS = [
  "mon_done", "tue_done", "wed_done", "thu_done",
  "fri_done", "sat_done", "sun_done",
] as const;
const HABIT_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Aggregate tasks and habits for a given month into an analytics object.
 */
export async function fetchMonthlyAnalytics(
  userId: string,
  monthYear: string
): Promise<MonthlyAnalytics> {
  const supabase = getClient();
  const { start, end } = getMonthRange(monthYear);
  const weekStarts = getWeekStartsForMonth(monthYear);

  // ─── Fetch tasks for the month ───
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  const allTasks = tasks || [];

  // ─── Fetch habits for all weeks overlapping this month ───
  const { data: habits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .in("week_start_date", weekStarts)
    .order("week_start_date", { ascending: true });

  const allHabits = habits || [];

  // ─── Task Stats ───
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.is_completed).length;
  const missedTasks = totalTasks - completedTasks;
  const taskCompletionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  // ─── Habit Stats ───
  let totalHabitSlots = 0;
  let completedHabitSlots = 0;

  allHabits.forEach((h) => {
    HABIT_DAY_KEYS.forEach((key) => {
      totalHabitSlots++;
      if (h[key]) completedHabitSlots++;
    });
  });

  const habitCompletionRate = totalHabitSlots > 0
    ? Math.round((completedHabitSlots / totalHabitSlots) * 100)
    : 0;

  // ─── Combined Productivity Score ───
  // 60% weight on tasks, 40% on habits
  const productivityScore = Math.round(
    taskCompletionRate * 0.6 + habitCompletionRate * 0.4
  );

  // ─── Habit Performance (per habit) ───
  const habitMap = new Map<string, {
    total: number; done: number;
    weekdayTotal: number; weekdayDone: number;
    weekendTotal: number; weekendDone: number;
  }>();

  allHabits.forEach((h) => {
    const entry = habitMap.get(h.habit_name) || {
      total: 0, done: 0,
      weekdayTotal: 0, weekdayDone: 0,
      weekendTotal: 0, weekendDone: 0,
    };

    HABIT_DAY_KEYS.forEach((key, i) => {
      entry.total++;
      if (h[key]) entry.done++;

      // Mon–Fri = weekday (indices 0–4), Sat–Sun = weekend (indices 5–6)
      if (i < 5) {
        entry.weekdayTotal++;
        if (h[key]) entry.weekdayDone++;
      } else {
        entry.weekendTotal++;
        if (h[key]) entry.weekendDone++;
      }
    });

    habitMap.set(h.habit_name, entry);
  });

  const habitPerformances: HabitPerformance[] = Array.from(habitMap.entries()).map(
    ([name, stats]) => {
      const completionRate = stats.total > 0
        ? Math.round((stats.done / stats.total) * 100)
        : 0;
      const weekdayRate = stats.weekdayTotal > 0
        ? Math.round((stats.weekdayDone / stats.weekdayTotal) * 100)
        : 0;
      const weekendRate = stats.weekendTotal > 0
        ? Math.round((stats.weekendDone / stats.weekendTotal) * 100)
        : 0;

      return {
        name,
        completionRate,
        totalSlots: stats.total,
        completedSlots: stats.done,
        weekdayRate,
        weekendRate,
        trend: "steady" as const,
      };
    }
  );

  // Sort by completion rate
  habitPerformances.sort((a, b) => b.completionRate - a.completionRate);

  const topHabits = habitPerformances.slice(0, 3);
  const weakHabits = [...habitPerformances]
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 3);

  // ─── Day-of-Week Pattern ───
  const dayTaskStats = HABIT_DAY_LABELS.map(() => ({ total: 0, done: 0 }));
  const dayHabitStats = HABIT_DAY_LABELS.map(() => ({ total: 0, done: 0 }));

  allTasks.forEach((t) => {
    const date = new Date(t.date + "T00:00:00");
    const jsDay = date.getDay(); // 0=Sun
    const idx = jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon, 6=Sun
    dayTaskStats[idx].total++;
    if (t.is_completed) dayTaskStats[idx].done++;
  });

  allHabits.forEach((h) => {
    HABIT_DAY_KEYS.forEach((key, i) => {
      dayHabitStats[i].total++;
      if (h[key]) dayHabitStats[i].done++;
    });
  });

  const dayOfWeekPattern: DayOfWeekPattern[] = HABIT_DAY_LABELS.map((day, i) => ({
    day,
    taskRate: dayTaskStats[i].total > 0
      ? Math.round((dayTaskStats[i].done / dayTaskStats[i].total) * 100)
      : 0,
    habitRate: dayHabitStats[i].total > 0
      ? Math.round((dayHabitStats[i].done / dayHabitStats[i].total) * 100)
      : 0,
  }));

  // ─── Weekly Breakdown ───
  const weeklyBreakdown: WeeklyBreakdown[] = weekStarts.map((ws, i) => {
    const weekEnd = new Date(ws);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const weekTasks = allTasks.filter((t) => t.date >= ws && t.date <= weekEndStr);
    const weekHabits = allHabits.filter((h) => h.week_start_date === ws);

    const wTotal = weekTasks.length;
    const wDone = weekTasks.filter((t) => t.is_completed).length;
    const wTaskRate = wTotal > 0 ? Math.round((wDone / wTotal) * 100) : 0;

    let hTotal = 0;
    let hDone = 0;
    weekHabits.forEach((h) => {
      HABIT_DAY_KEYS.forEach((key) => {
        hTotal++;
        if (h[key]) hDone++;
      });
    });
    const wHabitRate = hTotal > 0 ? Math.round((hDone / hTotal) * 100) : 0;

    return {
      weekLabel: `Week ${i + 1}`,
      weekStart: ws,
      taskRate: wTaskRate,
      habitRate: wHabitRate,
      score: Math.round(wTaskRate * 0.6 + wHabitRate * 0.4),
    };
  });

  return {
    monthYear,
    monthLabel: formatMonthLabel(monthYear),
    productivityScore,
    totalTasks,
    completedTasks,
    missedTasks,
    taskCompletionRate,
    totalHabitSlots,
    completedHabitSlots,
    habitCompletionRate,
    topHabits,
    weakHabits,
    dayOfWeekPattern,
    weeklyBreakdown,
  };
}

/**
 * Fetch all months that have data for a user (for the yearly overview).
 */
export async function fetchYearlyOverview(
  userId: string,
  year: number
): Promise<{ month: string; score: number }[]> {
  const results: { month: string; score: number }[] = [];

  // Query tasks and habits for the entire year in bulk
  const supabase = getClient();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("date, is_completed")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);

  const { data: habits } = await supabase
    .from("habits")
    .select("week_start_date, mon_done, tue_done, wed_done, thu_done, fri_done, sat_done, sun_done")
    .eq("user_id", userId)
    .gte("week_start_date", startDate)
    .lte("week_start_date", endDate);

  const allTasks = tasks || [];
  const allHabits = habits || [];

  for (let m = 1; m <= 12; m++) {
    const monthStr = String(m).padStart(2, "0");
    const monthYear = `${year}-${monthStr}`;
    const { start, end } = getMonthRange(monthYear);

    const monthTasks = allTasks.filter((t) => t.date >= start && t.date <= end);
    const weekStarts = getWeekStartsForMonth(monthYear);
    const monthHabits = allHabits.filter((h) =>
      weekStarts.includes(h.week_start_date)
    );

    const tTotal = monthTasks.length;
    const tDone = monthTasks.filter((t) => t.is_completed).length;
    const tRate = tTotal > 0 ? Math.round((tDone / tTotal) * 100) : 0;

    let hTotal = 0;
    let hDone = 0;
    monthHabits.forEach((h) => {
      HABIT_DAY_KEYS.forEach((key) => {
        hTotal++;
        if (h[key as keyof typeof h]) hDone++;
      });
    });
    const hRate = hTotal > 0 ? Math.round((hDone / hTotal) * 100) : 0;

    const hasData = tTotal > 0 || hTotal > 0;
    const score = hasData ? Math.round(tRate * 0.6 + hRate * 0.4) : -1;

    results.push({ month: monthYear, score });
  }

  return results;
}

/**
 * Save/update a monthly evaluation snapshot to Supabase.
 */
export async function saveMonthlyEvaluation(
  userId: string,
  monthYear: string,
  analytics: MonthlyAnalytics
) {
  const supabase = getClient();

  const insights = analytics.weakHabits
    .map((h) => `${h.name}: ${h.completionRate}% completion (weekday: ${h.weekdayRate}%, weekend: ${h.weekendRate}%)`)
    .join("\n");

  const suggestions = analytics.weakHabits
    .filter((h) => h.weekendRate < h.weekdayRate - 20)
    .map((h) => `Consider scheduling "${h.name}" differently on weekends (${h.weekendRate}% vs ${h.weekdayRate}% weekday)`)
    .join("\n") || "Great consistency! Keep up the momentum.";

  const { data: existing } = await supabase
    .from("monthly_evaluations")
    .select("id")
    .eq("user_id", userId)
    .eq("month_year", monthYear)
    .maybeSingle();

  // Map 0-100 score to 1-10 for the DB constraint
  const dbScore = Math.max(1, Math.min(10, Math.round(analytics.productivityScore / 10)));

  if (existing) {
    await supabase
      .from("monthly_evaluations")
      .update({
        productivity_score: dbScore,
        missed_insights: insights,
        improvement_suggestions: suggestions,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("monthly_evaluations").insert({
      user_id: userId,
      month_year: monthYear,
      productivity_score: dbScore,
      missed_insights: insights,
      improvement_suggestions: suggestions,
    });
  }
}

// ════════════════════════════════════════════════════════
//  Generate Demo Data for Preview Mode
// ════════════════════════════════════════════════════════

export function generateDemoAnalytics(monthYear: string): MonthlyAnalytics {
  const monthLabel = formatMonthLabel(monthYear);

  // Seed-based pseudo-random for consistent demo data
  const [, mStr] = monthYear.split("-");
  const m = parseInt(mStr);
  const seed = m * 17 + 42;
  const rand = (min: number, max: number) =>
    min + ((seed * (max - min + 1)) % (max - min + 1));

  const totalTasks = rand(80, 160);
  const completedTasks = Math.round(totalTasks * (rand(55, 90) / 100));
  const missedTasks = totalTasks - completedTasks;
  const taskCompletionRate = Math.round((completedTasks / totalTasks) * 100);

  const totalHabitSlots = rand(140, 280);
  const completedHabitSlots = Math.round(totalHabitSlots * (rand(50, 85) / 100));
  const habitCompletionRate = Math.round((completedHabitSlots / totalHabitSlots) * 100);

  const productivityScore = Math.round(taskCompletionRate * 0.6 + habitCompletionRate * 0.4);

  const habitNames = [
    "Wake up at 6:30", "Drink 2L of water", "Cold shower", "Gym",
    "Reading 10 pages", "Budget tracking", "Studying", "Stretching",
    "Meditation", "No vape",
  ];

  const habitPerformances: HabitPerformance[] = habitNames.map((name, i) => {
    const rate = Math.max(20, Math.min(100, rand(40, 95) + (i % 3 === 0 ? 15 : -10)));
    const wdRate = Math.min(100, rate + rand(0, 15));
    const weRate = Math.max(0, rate - rand(5, 25));
    return {
      name,
      completionRate: rate,
      totalSlots: rand(20, 35),
      completedSlots: Math.round(rand(20, 35) * rate / 100),
      weekdayRate: wdRate,
      weekendRate: weRate,
      trend: rate > 70 ? "improving" : rate < 50 ? "declining" : "steady",
    };
  });

  habitPerformances.sort((a, b) => b.completionRate - a.completionRate);

  const dayOfWeekPattern: DayOfWeekPattern[] = [
    { day: "Mon", taskRate: rand(65, 90), habitRate: rand(60, 85) },
    { day: "Tue", taskRate: rand(70, 95), habitRate: rand(65, 90) },
    { day: "Wed", taskRate: rand(60, 85), habitRate: rand(55, 80) },
    { day: "Thu", taskRate: rand(65, 90), habitRate: rand(60, 85) },
    { day: "Fri", taskRate: rand(55, 80), habitRate: rand(50, 75) },
    { day: "Sat", taskRate: rand(30, 60), habitRate: rand(25, 55) },
    { day: "Sun", taskRate: rand(35, 65), habitRate: rand(30, 60) },
  ];

  const weeklyBreakdown: WeeklyBreakdown[] = [
    { weekLabel: "Week 1", weekStart: "", taskRate: rand(55, 85), habitRate: rand(50, 80), score: 0 },
    { weekLabel: "Week 2", weekStart: "", taskRate: rand(60, 90), habitRate: rand(55, 85), score: 0 },
    { weekLabel: "Week 3", weekStart: "", taskRate: rand(50, 80), habitRate: rand(45, 75), score: 0 },
    { weekLabel: "Week 4", weekStart: "", taskRate: rand(65, 95), habitRate: rand(60, 90), score: 0 },
  ].map((w) => ({
    ...w,
    score: Math.round(w.taskRate * 0.6 + w.habitRate * 0.4),
  }));

  return {
    monthYear,
    monthLabel,
    productivityScore,
    totalTasks,
    completedTasks,
    missedTasks,
    taskCompletionRate,
    totalHabitSlots,
    completedHabitSlots,
    habitCompletionRate,
    topHabits: habitPerformances.slice(0, 3),
    weakHabits: [...habitPerformances].sort((a, b) => a.completionRate - b.completionRate).slice(0, 3),
    dayOfWeekPattern,
    weeklyBreakdown,
  };
}

export function generateDemoYearlyOverview(year: number): { month: string; score: number }[] {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const monthStr = `${year}-${String(m).padStart(2, "0")}`;

    // Future months have no data
    if (year > currentYear || (year === currentYear && m > currentMonth)) {
      return { month: monthStr, score: -1 };
    }

    const seed = m * 17 + 42;
    const score = 40 + ((seed * 7) % 50);
    return { month: monthStr, score };
  });
}
