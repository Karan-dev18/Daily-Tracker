"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Circle, Plus, Trash2, CopyPlus, Loader2, CalendarClock, Repeat } from "lucide-react";
import {
  fetchTasksForDate,
  copyPreviousDayTasks,
  addTask,
  deleteTaskById,
  toggleTaskCompletion,
  isSupabaseSetupError,
} from "@/lib/supabase/crud";
import type { TaskType } from "@/lib/types/database";

// ════════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════════

interface TodayTask {
  id: string | null;       // DB primary key; null until the insert resolves
  name: string;
  completed: boolean;
  taskType: TaskType;      // 'recurring' | 'deadline'
  dueDate: string | null;  // ISO date for deadlines, else null
}

interface TodayPanelProps {
  userId: string;       // required — this panel only renders for authed users
  todayDate: string;    // ISO "2026-05-31"
}

type StorageMode = "remote" | "local";

// ════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function getUserFacingError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

function getLocalTaskStorageKey(userId: string, date: string): string {
  return `daily-tracker:today-tasks:${userId}:${date}`;
}

function readLocalTasks(userId: string, date: string): TodayTask[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(getLocalTaskStorageKey(userId, date));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((task) => {
        if (
          typeof task === "object" &&
          task !== null &&
          typeof task.id === "string" &&
          typeof task.name === "string" &&
          typeof task.completed === "boolean"
        ) {
          const taskType: TaskType = task.taskType === "deadline" ? "deadline" : "recurring";
          return {
            id: task.id,
            name: task.name,
            completed: task.completed,
            taskType,
            dueDate: typeof task.dueDate === "string" ? task.dueDate : null,
          };
        }
        return null;
      })
      .filter((task): task is TodayTask => task !== null);
  } catch {
    return [];
  }
}

function writeLocalTasks(userId: string, date: string, tasks: TodayTask[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getLocalTaskStorageKey(userId, date), JSON.stringify(tasks));
}

function findMostRecentLocalTasksBefore(userId: string, beforeDate: string): TodayTask[] | null {
  if (typeof window === "undefined") return null;

  const prefix = `daily-tracker:today-tasks:${userId}:`;
  let mostRecentDate: string | null = null;
  let mostRecentTasks: TodayTask[] | null = null;

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;

    const date = key.slice(prefix.length);
    if (date >= beforeDate) continue;

    const tasks = readLocalTasks(userId, date);
    if (tasks.length === 0) continue;

    if (!mostRecentDate || date > mostRecentDate) {
      mostRecentDate = date;
      mostRecentTasks = tasks;
    }
  }

  return mostRecentTasks;
}

// ════════════════════════════════════════════════════════
//  Component
// ════════════════════════════════════════════════════════

export default function TodayPanel({ userId, todayDate }: TodayPanelProps) {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("recurring");
  const [newDueDate, setNewDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>("remote");

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (storageMode !== "local" || !isLoaded) return;
    writeLocalTasks(userId, todayDate, tasks);
  }, [storageMode, isLoaded, tasks, userId, todayDate]);

  // ─── Load today's tasks on mount ───
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function load() {
      try {
        const rows = await fetchTasksForDate(userId, todayDate);
        setTasks(
          rows.map((r) => ({
            id: r.id,
            name: r.task_name,
            completed: r.is_completed,
            taskType: (r.task_type as TaskType) ?? "recurring",
            dueDate: r.due_date ?? null,
          }))
        );
        setNotice(null);
      } catch (err) {
        if (isSupabaseSetupError(err)) {
          console.warn("[TodayPanel] falling back to local task storage.");
          setStorageMode("local");
          setTasks(readLocalTasks(userId, todayDate));
          setError(null);
          setNotice(
            "Supabase tables are not ready yet, so Today's tasks are running in local-only mode in this browser."
          );
        } else {
          console.error("[TodayPanel] load failed:", err instanceof Error ? err.message : err);
          setError(getUserFacingError(err, "Couldn't load today's tasks."));
        }
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, [userId, todayDate]);

  const hasNoTasks = isLoaded && tasks.length === 0;

  // ─── Copy yesterday's routine (unfinished deadlines only) ───
  const handleCopyYesterday = useCallback(async () => {
    setIsCopying(true);
    setError(null);
    try {
      if (storageMode === "local") {
        const previousTasks = findMostRecentLocalTasksBefore(userId, todayDate);
        // Mirror the DB rule: only carry unfinished deadlines.
        const carryOver = (previousTasks ?? []).filter(
          (task) => task.taskType === "deadline" && !task.completed
        );
        if (carryOver.length === 0) {
          setError("No unfinished deadlines to carry over from a previous day.");
        } else {
          setTasks(
            carryOver.map((task) => ({
              id: crypto.randomUUID(),
              name: task.name,
              completed: false,
              taskType: "deadline",
              dueDate: task.dueDate,
            }))
          );
        }
        return;
      }

      const copied = await copyPreviousDayTasks(userId, todayDate);
      if (copied.length === 0) {
        setError("No unfinished deadlines to carry over from a previous day.");
      } else {
        // Re-fetch so we get the real DB ids for the newly inserted rows
        const rows = await fetchTasksForDate(userId, todayDate);
        setTasks(
          rows.map((r) => ({
            id: r.id,
            name: r.task_name,
            completed: r.is_completed,
            taskType: (r.task_type as TaskType) ?? "recurring",
            dueDate: r.due_date ?? null,
          }))
        );
      }
    } catch (err) {
      if (isSupabaseSetupError(err)) {
        console.warn("[TodayPanel] copy fell back to local mode.");
        setStorageMode("local");
        setNotice(
          "Supabase tables are not ready yet, so Today's tasks are running in local-only mode in this browser."
        );
      } else {
        console.error("[TodayPanel] copy failed:", err instanceof Error ? err.message : err);
        setError(getUserFacingError(err, "Couldn't copy yesterday's routine. Please try again."));
      }
    } finally {
      setIsCopying(false);
    }
  }, [storageMode, userId, todayDate]);

  // ─── Toggle a task ───
  const handleToggle = useCallback(
    (index: number) => {
      setTasks((prev) => {
        const next = [...prev];
        const t = { ...next[index], completed: !next[index].completed };
        next[index] = t;

        if (storageMode === "local") {
          return next;
        }

        toggleTaskCompletion(userId, todayDate, t.name, t.completed).catch((err) =>
          {
            if (isSupabaseSetupError(err)) {
              console.warn("[TodayPanel] toggle now using local-only mode.");
              setStorageMode("local");
              setNotice(
                "Supabase tables are not ready yet, so Today's tasks are running in local-only mode in this browser."
              );
              return;
            }
            console.error("[TodayPanel] toggle sync failed:", err instanceof Error ? err.message : err);
          }
        );
        return next;
      });
    },
    [storageMode, userId, todayDate]
  );

  // ─── Add a new task ───
  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = newTaskName.trim();
      if (!name) return;

      // Guard against duplicates in local state
      if (tasks.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
        setError("That task already exists for today.");
        return;
      }

      // Deadlines may carry an optional due date; recurring tasks never do.
      const taskType = newTaskType;
      const dueDate = taskType === "deadline" && newDueDate ? newDueDate : null;

      setError(null);
      setNewTaskName("");
      setNewDueDate("");
      setNewTaskType("recurring");

      if (storageMode === "local") {
        setTasks((prev) => [
          ...prev,
          { id: crypto.randomUUID(), name, completed: false, taskType, dueDate },
        ]);
        return;
      }

      // Optimistic add with a temporary id of null
      setTasks((prev) => [
        ...prev,
        { id: null, name, completed: false, taskType, dueDate },
      ]);

      try {
        const created = await addTask(userId, todayDate, name, { taskType, dueDate });
        // Patch in the real DB id so the row can be deleted by id later
        if (created?.id) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === null && t.name === name ? { ...t, id: created.id } : t
            )
          );
        }
      } catch (err) {
        if (isSupabaseSetupError(err)) {
          console.warn("[TodayPanel] add fell back to local mode.");
          setStorageMode("local");
          setNotice(
            "Supabase tables are not ready yet, so Today's tasks are running in local-only mode in this browser."
          );
          setTasks((prev) =>
            prev.map((task) =>
              task.id === null && task.name === name
                ? {
                    id: crypto.randomUUID(),
                    name: task.name,
                    completed: task.completed,
                    taskType: task.taskType,
                    dueDate: task.dueDate,
                  }
                : task
            )
          );
        } else {
          console.error("[TodayPanel] add failed:", err instanceof Error ? err.message : err);
          setError(getUserFacingError(err, "Couldn't add task. Please try again."));
          // Roll back optimistic add
          setTasks((prev) => prev.filter((t) => t.name !== name));
        }
      }
    },
    [newTaskName, newTaskType, newDueDate, storageMode, tasks, userId, todayDate]
  );

  // ─── Delete a task by id (today only — historical data untouched) ───
  const handleDelete = useCallback(
    async (index: number) => {
      const target = tasks[index];

      // Optimistically remove from UI
      setTasks((prev) => prev.filter((_, i) => i !== index));

      if (storageMode === "local") {
        return;
      }

      // If it has no DB id yet (insert still in flight), nothing to delete server-side
      if (!target.id) {
        console.warn("[TodayPanel] delete skipped: task has no DB id yet.");
        return;
      }

      try {
        await deleteTaskById(userId, target.id);
      } catch (err) {
        if (isSupabaseSetupError(err)) {
          console.warn("[TodayPanel] delete now using local-only mode.");
          setStorageMode("local");
          setNotice(
            "Supabase tables are not ready yet, so Today's tasks are running in local-only mode in this browser."
          );
        } else {
          console.error("[TodayPanel] delete failed:", err instanceof Error ? err.message : err);
          setError(getUserFacingError(err, "Couldn't delete task. Please try again."));
          // Roll back optimistic delete
          setTasks((prev) => {
            const next = [...prev];
            next.splice(index, 0, target);
            return next;
          });
        }
      }
    },
    [storageMode, tasks, userId]
  );

  // ─── Loading state ───
  if (!isLoaded) {
    return (
      <div className="bg-white rounded-xl border border-pink-200 p-4 flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="bg-white rounded-xl border border-pink-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-4 py-2.5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Today</p>
          <p className="text-[11px] opacity-90">{formatDisplayDate(todayDate)}</p>
        </div>
        {tasks.length > 0 && (
          <span className="text-xs font-semibold bg-white/20 rounded-full px-2.5 py-1">
            {doneCount}/{tasks.length} done
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {notice && (
          <p className="text-xs text-pink-600 bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
            {notice}
          </p>
        )}

        {error && (
          <p className="text-xs text-rose-500 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Empty state: Copy Yesterday's Routine */}
        {hasNoTasks ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <p className="text-sm text-pink-400 font-medium">No tasks logged for today yet.</p>
            <button
              onClick={handleCopyYesterday}
              disabled={isCopying}
              className="group flex items-center gap-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-60 text-white rounded-xl px-4 py-2.5 transition-all hover:shadow-md font-semibold text-sm"
            >
              {isCopying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CopyPlus className="w-4 h-4" />
              )}
              {isCopying ? "Copying..." : "Copy Yesterday's Routine"}
            </button>
          </div>
        ) : (
          /* Task list */
          <ul className="space-y-1.5">
            {tasks.map((task, i) => (
              <li
                key={task.id ?? `temp-${task.name}-${i}`}
                className="flex items-center gap-2 group rounded-lg hover:bg-pink-50 px-1.5 py-1 transition-colors"
              >
                <button
                  onClick={() => handleToggle(i)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0 fill-pink-100" />
                  ) : (
                    <Circle className="w-4 h-4 text-pink-300 shrink-0" />
                  )}
                  <span className="flex flex-col">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`text-xs leading-tight select-none transition-colors ${
                          task.completed
                            ? "text-pink-500 line-through decoration-pink-300"
                            : "text-pink-600"
                        }`}
                      >
                        {task.name}
                      </span>
                      {task.taskType === "deadline" ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1 py-0.5 shrink-0">
                          <CalendarClock className="w-2.5 h-2.5" />
                          Deadline
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-pink-500 bg-pink-50 border border-pink-200 rounded px-1 py-0.5 shrink-0">
                          <Repeat className="w-2.5 h-2.5" />
                          Recurring
                        </span>
                      )}
                    </span>
                    {task.taskType === "deadline" && task.dueDate && (
                      <span className="text-[9px] text-rose-400 mt-0.5">
                        Due {formatDisplayDate(task.dueDate)}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  onClick={() => handleDelete(i)}
                  className="text-pink-300 hover:text-rose-500 shrink-0 transition-colors"
                  aria-label={`Delete ${task.name}`}
                  title="Remove task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add new task — always available */}
        <form onSubmit={handleAdd} className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Add a task for today..."
              className="flex-1 text-xs border border-pink-200 focus:border-pink-400 focus:outline-none rounded-lg px-3 py-2 text-pink-700 placeholder:text-pink-300"
            />
            <button
              type="submit"
              disabled={!newTaskName.trim()}
              className="flex items-center justify-center bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-lg w-8 h-8 shrink-0 transition-colors"
              aria-label="Add task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Task type selector */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-pink-200 overflow-hidden text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setNewTaskType("recurring")}
                aria-pressed={newTaskType === "recurring"}
                className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors ${
                  newTaskType === "recurring"
                    ? "bg-pink-500 text-white"
                    : "bg-white text-pink-500 hover:bg-pink-50"
                }`}
              >
                <Repeat className="w-3 h-3" />
                Recurring
              </button>
              <button
                type="button"
                onClick={() => setNewTaskType("deadline")}
                aria-pressed={newTaskType === "deadline"}
                className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors border-l border-pink-200 ${
                  newTaskType === "deadline"
                    ? "bg-rose-500 text-white"
                    : "bg-white text-rose-500 hover:bg-rose-50"
                }`}
              >
                <CalendarClock className="w-3 h-3" />
                Deadline
              </button>
            </div>

            {/* Optional due date — only for deadlines */}
            {newTaskType === "deadline" && (
              <input
                type="date"
                value={newDueDate}
                min={todayDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="text-xs border border-rose-200 focus:border-rose-400 focus:outline-none rounded-lg px-2 py-1.5 text-rose-600"
                aria-label="Due date (optional)"
              />
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
