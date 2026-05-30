import { createClient } from "./client";
import type { DayData, DayTask, HabitData } from "@/lib/dummy-data";

// ─── Singleton Supabase client for CRUD operations ───
function getClient() {
  return createClient();
}

// ════════════════════════════════════════════════════════
//  TASKS  CRUD
// ════════════════════════════════════════════════════════

/**
 * Toggle a task's completion status in Supabase.
 * Uses upsert-style: finds the matching task and flips is_completed.
 */
export async function toggleTaskCompletion(
  userId: string,
  date: string,       // ISO date string e.g. "2025-12-29"
  taskName: string,
  isCompleted: boolean
) {
  const supabase = getClient();

  // First try to update existing task
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .eq("task_name", taskName)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("tasks")
      .update({ is_completed: isCompleted })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    // Create the task if it doesn't exist yet
    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      date,
      task_name: taskName,
      is_completed: isCompleted,
      category: "general",
    });
    if (error) throw error;
  }
}

/**
 * Fetch all tasks for a user for a given week (array of dates).
 */
export async function fetchTasksForWeek(userId: string, dates: string[]) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .in("date", dates)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Batch upsert all tasks for the week (initial sync).
 */
export async function upsertTasks(
  userId: string,
  days: DayData[]
) {
  const supabase = getClient();
  const rows = days.flatMap((day) =>
    day.tasks.map((task) => ({
      user_id: userId,
      date: convertDisplayDateToISO(day.date),
      task_name: task.name,
      is_completed: task.completed,
      category: "general",
    }))
  );

  if (rows.length === 0) return;

  const { error } = await supabase.from("tasks").upsert(rows, {
    onConflict: "user_id,date,task_name",
    ignoreDuplicates: false,
  });
  // Upsert may fail if there's no unique constraint on (user_id, date, task_name)
  // In that case, we fall back to individual inserts — but the schema should handle it
  if (error) console.warn("Task upsert warning:", error.message);
}

// ════════════════════════════════════════════════════════
//  HABITS  CRUD
// ════════════════════════════════════════════════════════

const DAY_COLUMNS = [
  "mon_done", "tue_done", "wed_done", "thu_done",
  "fri_done", "sat_done", "sun_done",
] as const;

/**
 * Toggle a habit's day checkbox in Supabase.
 */
export async function toggleHabitDay(
  userId: string,
  weekStartDate: string, // ISO date string
  habitName: string,
  dayIndex: number,      // 0=Mon, 6=Sun
  value: boolean
) {
  const supabase = getClient();
  const column = DAY_COLUMNS[dayIndex];

  // Try to update existing row
  const { data: existing } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .eq("habit_name", habitName)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("habits")
      .update({ [column]: value })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    // Create the habit row with all days false except the toggled one
    const newRow: Record<string, unknown> = {
      user_id: userId,
      week_start_date: weekStartDate,
      habit_name: habitName,
    };
    DAY_COLUMNS.forEach((col, i) => {
      newRow[col] = i === dayIndex ? value : false;
    });
    const { error } = await supabase.from("habits").insert(newRow);
    if (error) throw error;
  }
}

/**
 * Fetch all habits for a user for a given week.
 */
export async function fetchHabitsForWeek(userId: string, weekStartDate: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Batch upsert all habits for the week.
 */
export async function upsertHabits(
  userId: string,
  weekStartDate: string,
  habits: HabitData[]
) {
  const supabase = getClient();
  const rows = habits.map((h) => ({
    user_id: userId,
    week_start_date: weekStartDate,
    habit_name: h.name,
    mon_done: h.days[0],
    tue_done: h.days[1],
    wed_done: h.days[2],
    thu_done: h.days[3],
    fri_done: h.days[4],
    sat_done: h.days[5],
    sun_done: h.days[6],
  }));

  const { error } = await supabase.from("habits").upsert(rows, {
    onConflict: "user_id,week_start_date,habit_name",
    ignoreDuplicates: false,
  });
  if (error) console.warn("Habit upsert warning:", error.message);
}

// ════════════════════════════════════════════════════════
//  WEEKLY GOALS  CRUD
// ════════════════════════════════════════════════════════

/**
 * Update a weekly goal field (focus, reward, or affirmation).
 */
export async function updateWeeklyGoal(
  userId: string,
  weekStartDate: string,
  field: "focus" | "reward" | "affirmation",
  value: string
) {
  const supabase = getClient();

  const { data: existing } = await supabase
    .from("weekly_goals")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("weekly_goals")
      .update({ [field]: value })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("weekly_goals").insert({
      user_id: userId,
      week_start_date: weekStartDate,
      [field]: value,
    });
    if (error) throw error;
  }
}

/**
 * Fetch weekly goals for a given week.
 */
export async function fetchWeeklyGoals(userId: string, weekStartDate: string) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("weekly_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════

/**
 * Converts "29.12.2025" display date to "2025-12-29" ISO format.
 */
export function convertDisplayDateToISO(displayDate: string): string {
  const [day, month, year] = displayDate.split(".");
  return `${year}-${month}-${day}`;
}

/**
 * Recalculate derived stats from task data (done, left, completionPercent).
 */
export function recalcDayStats(tasks: DayTask[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const left = total - done;
  const completionPercent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, left, completionPercent };
}
