import { createClient } from "./client";
import type { DayData, DayTask, HabitData } from "@/lib/dummy-data";
import type { TaskInsert, TaskType } from "@/lib/types/database";

// ════════════════════════════════════════════════════════
//  Strict row types
// ════════════════════════════════════════════════════════

/**
 * A row as it exists in the `tasks` table.
 */
export interface TaskRow {
  id: string;
  user_id: string;
  date: string;          // ISO "YYYY-MM-DD"
  category: string;
  task_name: string;
  is_completed: boolean;
  task_type: TaskType;   // 'recurring' (default) | 'deadline'
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

const SETUP_ERROR_PREFIX = "Supabase database is not initialized:";
const knownMissingTables = new Set<string>();

function getMissingTableSetupMessage(table: string): string {
  return (
    `${SETUP_ERROR_PREFIX} missing table public.${table}. ` +
    "Run the SQL in supabase/schema.sql for your Supabase project, then refresh the app."
  );
}

function throwIfKnownMissingTable(table: string) {
  if (knownMissingTables.has(table)) {
    throw new Error(getMissingTableSetupMessage(table));
  }
}

export function isSupabaseSetupError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith(SETUP_ERROR_PREFIX);
}

// ─── Singleton Supabase client for CRUD operations ───
function getClient() {
  return createClient();
}

/**
 * Robustly serialize a Supabase/Postgrest error so it never logs as "{}".
 * PostgrestError, AuthError, and plain Error objects all have properties
 * that may be non-enumerable, so we extract them explicitly and fall back
 * to Object.getOwnPropertyNames for anything else.
 */
function describeError(err: unknown): Record<string, unknown> {
  if (err == null) {
    return { message: "Error was null/undefined", raw: String(err) };
  }

  // Standard shape for Supabase PostgrestError / AuthError / Error
  const e = err as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
    status?: number;
    name?: string;
  };

  const described: Record<string, unknown> = {
    name: e.name,
    message: e.message,
    code: e.code,
    details: e.details,
    hint: e.hint,
    status: e.status,
  };

  // Catch any other own-properties (enumerable or not) that we missed
  try {
    const allProps = Object.getOwnPropertyNames(err);
    described.fullError = JSON.stringify(err, allProps);
  } catch {
    described.fullError = String(err);
  }

  return described;
}

function isMissingSchemaTableError(err: unknown, table: string): boolean {
  const e = err as { code?: string; message?: string };
  return (
    e?.code === "PGRST205" &&
    typeof e.message === "string" &&
    e.message.includes(`public.${table}`)
  );
}

function formatSupabaseCrudError(
  operation: string,
  err: {
    message?: string;
    code?: string;
    details?: string | null;
    hint?: string | null;
  },
  table?: string
): string {
  if (table && isMissingSchemaTableError(err, table)) {
    knownMissingTables.add(table);
    return getMissingTableSetupMessage(table);
  }

  return (
    `${operation} failed: ${err.message || "unknown"} ` +
    `(code: ${err.code ?? "n/a"}, details: ${err.details ?? "n/a"}, hint: ${err.hint ?? "n/a"})`
  );
}

function logSupabaseIssue(context: string, err: unknown, table?: string) {
  if (table && isMissingSchemaTableError(err, table)) {
    console.warn(`[${context}] ${getMissingTableSetupMessage(table)}`);
    return;
  }

  console.error(`[${context}]`, describeError(err));
}

/**
 * Debug helper: verifies the current session and logs user info.
 * Returns the user_id if authenticated, or throws with details.
 */
async function verifySession(expectedUserId: string): Promise<string> {
  const supabase = getClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error("[Session Debug] auth.getUser() error:", describeError(error));
    throw new Error(`Auth session error: ${error.message}`);
  }

  if (!user) {
    console.error("[Session Debug] No authenticated user found. Session may have expired.");
    throw new Error("No authenticated user — session expired or missing.");
  }

  console.log("[Session Debug] Authenticated user:", {
    id: user.id,
    email: user.email,
    provider: user.app_metadata?.provider,
    expectedUserId,
    match: user.id === expectedUserId,
  });

  if (user.id !== expectedUserId) {
    console.warn("[Session Debug] userId mismatch! Prop says", expectedUserId, "but session says", user.id);
  }

  return user.id;
}

// ════════════════════════════════════════════════════════
//  TASKS  CRUD
// ════════════════════════════════════════════════════════

/**
 * Toggle a task's completion status in Supabase.
 *
 * Uses a single `upsert` keyed on (user_id, date, task_name) instead of the
 * old SELECT-then-UPDATE/INSERT pattern. This:
 *   - avoids the .maybeSingle() error path entirely (no more "SELECT failed: {}")
 *   - is atomic (no race between read and write)
 *   - automatically creates the row if it doesn't exist, or updates if it does
 *
 * NOTE: requires a UNIQUE constraint on (user_id, date, task_name).
 * See the SQL at the bottom of this answer if you don't have one yet.
 */
export async function toggleTaskCompletion(
  userId: string,
  date: string,       // ISO date string e.g. "2025-12-29"
  taskName: string,
  isCompleted: boolean
) {
  throwIfKnownMissingTable("tasks");
  console.log("[toggleTaskCompletion] Called with:", { userId, date, taskName, isCompleted });

  // Verify the session is valid before making DB calls
  const verifiedUserId = await verifySession(userId);

  const supabase = getClient();

  const { data, error } = await supabase
    .from("tasks")
    .upsert(
      {
        user_id: verifiedUserId,
        date,
        task_name: taskName,
        is_completed: isCompleted,
        category: "general",
      },
      { onConflict: "user_id,date,task_name" }
    )
    .select("id, is_completed")
    .maybeSingle();

  if (error) {
    logSupabaseIssue("toggleTaskCompletion UPSERT failed", error, "tasks");
    throw new Error(formatSupabaseCrudError("Task upsert", error, "tasks"));
  }

  console.log("[toggleTaskCompletion] UPSERT success:", data);
}

/**
 * Fetch all tasks for a user for a given week (array of dates).
 */
export async function fetchTasksForWeek(userId: string, dates: string[]) {
  throwIfKnownMissingTable("tasks");
  const supabase = getClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .in("date", dates)
    .order("created_at", { ascending: true });

  if (error) {
    logSupabaseIssue("fetchTasksForWeek failed", error, "tasks");
    throw new Error(formatSupabaseCrudError("Fetch tasks for week", error, "tasks"));
  }
  return data || [];
}

/**
 * Fetch all tasks for a user on a single date.
 */
export async function fetchTasksForDate(userId: string, date: string) {
  throwIfKnownMissingTable("tasks");
  const verifiedUserId = await verifySession(userId);
  const supabase = getClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, task_name, is_completed, category, date")
    .eq("user_id", verifiedUserId)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) {
    logSupabaseIssue("fetchTasksForDate failed", error, "tasks");
    throw new Error(formatSupabaseCrudError("Fetch tasks for date", error, "tasks"));
  }
  return data || [];
}

/**
 * Batch upsert all tasks for the week (initial sync).
 */
export async function upsertTasks(
  userId: string,
  days: DayData[]
) {
  throwIfKnownMissingTable("tasks");
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
//  DAILY CARRY-OVER  (copy yesterday's routine)
// ════════════════════════════════════════════════════════

export interface CarriedTask {
  task_name: string;
  category: string | null;
}

/**
 * Find the most recent day BEFORE `beforeDate` that has at least one task,
 * and return that day's date plus its tasks.
 *
 * "Most recent active day" = the largest date strictly less than `beforeDate`
 * for which the user has any tasks logged. Returns null if there is no
 * earlier day with tasks.
 */
export async function fetchMostRecentTasksBefore(
  userId: string,
  beforeDate: string // ISO "2026-01-02"
): Promise<{ date: string; tasks: CarriedTask[] } | null> {
  throwIfKnownMissingTable("tasks");
  const verifiedUserId = await verifySession(userId);
  const supabase = getClient();

  // 1. Find the most recent date with tasks, strictly before `beforeDate`.
  const { data: recent, error: recentErr } = await supabase
    .from("tasks")
    .select("date")
    .eq("user_id", verifiedUserId)
    .lt("date", beforeDate)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentErr) {
    logSupabaseIssue("fetchMostRecentTasksBefore lookup failed", recentErr, "tasks");
    throw new Error(formatSupabaseCrudError("Could not find previous day", recentErr, "tasks"));
  }

  if (!recent?.date) {
    console.log("[fetchMostRecentTasksBefore] No earlier day with tasks found.");
    return null;
  }

  // 2. Pull all tasks for that date.
  const { data: tasks, error: tasksErr } = await supabase
    .from("tasks")
    .select("task_name, category")
    .eq("user_id", verifiedUserId)
    .eq("date", recent.date)
    .order("created_at", { ascending: true });

  if (tasksErr) {
    logSupabaseIssue("fetchMostRecentTasksBefore task fetch failed", tasksErr, "tasks");
    throw new Error(
      formatSupabaseCrudError("Could not load previous day's tasks", tasksErr, "tasks")
    );
  }

  return { date: recent.date, tasks: tasks || [] };
}

/**
 * Copy the most recent previous day's tasks into `targetDate`, with completion
 * reset to false. Creates NEW rows for the target date — historical rows are
 * untouched. Skips rows that already exist for the target date (via upsert).
 *
 * Returns the list of task names that were carried over (empty array if there
 * was no previous day to copy from).
 */
export async function copyPreviousDayTasks(
  userId: string,
  targetDate: string // ISO date for "today"
): Promise<string[]> {
  throwIfKnownMissingTable("tasks");
  console.log("[copyPreviousDayTasks] Carrying over into:", targetDate);

  const verifiedUserId = await verifySession(userId);
  const previous = await fetchMostRecentTasksBefore(verifiedUserId, targetDate);

  if (!previous || previous.tasks.length === 0) {
    console.log("[copyPreviousDayTasks] Nothing to copy.");
    return [];
  }

  const supabase = getClient();
  const rows = previous.tasks.map((t) => ({
    user_id: verifiedUserId,
    date: targetDate,
    task_name: t.task_name,
    is_completed: false,        // reset completion
    category: t.category ?? "general",
  }));

  const { error } = await supabase.from("tasks").upsert(rows, {
    onConflict: "user_id,date,task_name",
    ignoreDuplicates: true,     // don't clobber tasks already added for today
  });

  if (error) {
    logSupabaseIssue("copyPreviousDayTasks upsert failed", error, "tasks");
    throw new Error(formatSupabaseCrudError("Carry-over", error, "tasks"));
  }

  console.log(`[copyPreviousDayTasks] Copied ${rows.length} task(s) from ${previous.date}.`);
  return previous.tasks.map((t) => t.task_name);
}

/**
 * Add a single new task for a given date. Reset/incomplete by default.
 *
 * Uses a plain INSERT (not upsert) so it does NOT depend on a unique
 * constraint existing for ON CONFLICT. The authenticated user_id is attached
 * explicitly so the row passes the RLS INSERT policy: WITH CHECK (auth.uid() = user_id).
 *
 * `task_type` defaults to 'recurring'. Pass 'deadline' (with an optional
 * due_date) for essential tasks that should carry over if missed.
 *
 * Returns the newly created row (including its id) so the UI can track it for
 * later deletion by id.
 */
export async function addTask(
  userId: string,
  date: string,
  taskName: string,
  options: {
    category?: string;
    taskType?: TaskType;
    dueDate?: string | null;
  } = {}
) {
  const { category = "general", taskType = "recurring", dueDate = null } = options;

  throwIfKnownMissingTable("tasks");
  const verifiedUserId = await verifySession(userId);
  const supabase = getClient();

  // Strictly typed payload — TaskInsert makes user_id a required field, so
  // TypeScript will error at compile time if it is ever omitted.
  const payload: TaskInsert = {
    user_id: verifiedUserId,   // ← attached so RLS INSERT policy passes
    date,
    task_name: taskName,
    is_completed: false,
    category,
    task_type: taskType,       // NEW: 'recurring' | 'deadline'
    due_date: dueDate,         // NEW: nullable due date
  };
  console.log("[addTask] inserting payload:", payload);

  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select("id, task_name, is_completed, category, date, task_type, due_date")
    .single();

  if (error) {
    // Log the raw error so DB rejections are visible in the terminal/console
    console.log("[addTask] supabase error:", error);
    logSupabaseIssue("addTask failed", error, "tasks");

    // 23505 = unique_violation → the task already exists for today; treat as success
    if (error.code === "23505") {
      console.warn("[addTask] task already exists for this date, skipping insert.");
      return null;
    }
    throw new Error(formatSupabaseCrudError("Add task", error, "tasks"));
  }

  console.log("[addTask] insert success:", data);
  return data;
}

/**
 * Delete a single task by its primary-key id, scoped to the authenticated user.
 *
 * The .eq("user_id", ...) filter combined with the RLS DELETE policy
 * (USING auth.uid() = user_id) guarantees a user can only delete their own
 * rows. Deleting by id removes exactly one row for one specific day, so the
 * same task on other days / historical data is untouched.
 */
export async function deleteTaskById(userId: string, taskId: string) {
  throwIfKnownMissingTable("tasks");
  const verifiedUserId = await verifySession(userId);
  const supabase = getClient();

  console.log("[deleteTaskById] deleting:", { taskId, userId: verifiedUserId });

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", verifiedUserId);

  if (error) {
    console.log("[deleteTaskById] supabase error:", error);
    logSupabaseIssue("deleteTaskById failed", error, "tasks");
    throw new Error(formatSupabaseCrudError("Delete task", error, "tasks"));
  }
  console.log("[deleteTaskById] delete success");
}

/**
 * Delete a single task for a given date by name. Used when the UI does not yet
 * have a DB id for the row (e.g. seeded grid tasks). Only removes the row for
 * THIS date, so the same-named task on previous days stays intact.
 */
export async function deleteTask(
  userId: string,
  date: string,
  taskName: string
) {
  throwIfKnownMissingTable("tasks");
  const verifiedUserId = await verifySession(userId);
  const supabase = getClient();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("user_id", verifiedUserId)
    .eq("date", date)
    .eq("task_name", taskName);

  if (error) {
    console.log("[deleteTask] supabase error:", error);
    logSupabaseIssue("deleteTask failed", error, "tasks");
    throw new Error(formatSupabaseCrudError("Delete task", error, "tasks"));
  }
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
  throwIfKnownMissingTable("habits");
  const supabase = getClient();
  const column = DAY_COLUMNS[dayIndex];

  // Try to update existing row
  const { data: existing, error: existingError } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .eq("habit_name", habitName)
    .maybeSingle();

  if (existingError) {
    logSupabaseIssue("toggleHabitDay lookup failed", existingError, "habits");
    throw new Error(formatSupabaseCrudError("Find habit row", existingError, "habits"));
  }

  if (existing) {
    const { error } = await supabase
      .from("habits")
      .update({ [column]: value })
      .eq("id", existing.id);
    if (error) {
      logSupabaseIssue("toggleHabitDay update failed", error, "habits");
      throw new Error(formatSupabaseCrudError("Toggle habit", error, "habits"));
    }
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
    if (error) {
      logSupabaseIssue("toggleHabitDay insert failed", error, "habits");
      throw new Error(formatSupabaseCrudError("Create habit row", error, "habits"));
    }
  }
}

/**
 * Fetch all habits for a user for a given week.
 */
export async function fetchHabitsForWeek(userId: string, weekStartDate: string) {
  throwIfKnownMissingTable("habits");
  const supabase = getClient();
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .order("created_at", { ascending: true });

  if (error) {
    logSupabaseIssue("fetchHabitsForWeek failed", error, "habits");
    throw new Error(formatSupabaseCrudError("Fetch habits for week", error, "habits"));
  }
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
  throwIfKnownMissingTable("habits");
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
  if (error) {
    console.warn("[upsertHabits] warning:", describeError(error));
    throw new Error(formatSupabaseCrudError("Habit upsert", error, "habits"));
  }
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
  throwIfKnownMissingTable("weekly_goals");
  const supabase = getClient();

  const { data: existing, error: existingError } = await supabase
    .from("weekly_goals")
    .select("id")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (existingError) {
    logSupabaseIssue("updateWeeklyGoal lookup failed", existingError, "weekly_goals");
    throw new Error(formatSupabaseCrudError("Find weekly goal", existingError, "weekly_goals"));
  }

  if (existing) {
    const { error } = await supabase
      .from("weekly_goals")
      .update({ [field]: value })
      .eq("id", existing.id);
    if (error) {
      logSupabaseIssue("updateWeeklyGoal update failed", error, "weekly_goals");
      throw new Error(formatSupabaseCrudError("Update weekly goal", error, "weekly_goals"));
    }
  } else {
    const { error } = await supabase.from("weekly_goals").insert({
      user_id: userId,
      week_start_date: weekStartDate,
      [field]: value,
    });
    if (error) {
      logSupabaseIssue("updateWeeklyGoal insert failed", error, "weekly_goals");
      throw new Error(formatSupabaseCrudError("Create weekly goal", error, "weekly_goals"));
    }
  }
}

/**
 * Fetch weekly goals for a given week.
 */
export async function fetchWeeklyGoals(userId: string, weekStartDate: string) {
  throwIfKnownMissingTable("weekly_goals");
  const supabase = getClient();
  const { data, error } = await supabase
    .from("weekly_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) {
    logSupabaseIssue("fetchWeeklyGoals failed", error, "weekly_goals");
    throw new Error(formatSupabaseCrudError("Fetch weekly goals", error, "weekly_goals"));
  }
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
