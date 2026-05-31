"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Circle, Plus, Trash2, CopyPlus, Loader2, CalendarClock, Repeat, AlertTriangle, Pencil, Check, X } from "lucide-react";
import {
  fetchTasksForDate,
  copyPreviousDayTasks,
  addTask,
  deleteTaskById,
  toggleTaskCompletion,
  renameTask,
  isSupabaseSetupError,
} from "@/lib/supabase/crud";
import type { TaskType } from "@/lib/types/database";
import { celebrate, originFromEvent } from "@/lib/confetti";
import { useStreak } from "@/components/dashboard/StreakContext";

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

type DeadlineStatus = "none" | "today" | "overdue" | "upcoming";

/**
 * ISO date strings (YYYY-MM-DD) compare correctly with string comparison,
 * so we can classify a due date relative to today without Date parsing.
 */
function getDeadlineStatus(dueDate: string | null, todayDate: string): DeadlineStatus {
  if (!dueDate) return "none";
  if (dueDate === todayDate) return "today";
  if (dueDate < todayDate) return "overdue";
  return "upcoming";
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
  const { refreshStreak } = useStreak();
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("recurring");
  const [newDueDate, setNewDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>("remote");

  // Inline editing state: index of the task being edited + its draft text.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

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
    (index: number, event?: { clientX: number; clientY: number }) => {
      setTasks((prev) => {
        const next = [...prev];
        const t = { ...next[index], completed: !next[index].completed };
        next[index] = t;

        // 🎉 Celebrate only when a task transitions to completed.
        if (t.completed) {
          celebrate(originFromEvent(event));
        }

        // ── Streak: did this complete the FINAL recurring habit for today? ──
        const recurring = next.filter((task) => task.taskType === "recurring");
        const justFinishedAllRecurring =
          t.completed &&
          t.taskType === "recurring" &&
          recurring.length > 0 &&
          recurring.every((task) => task.completed);

        if (storageMode === "local") {
          // No DB to sync; refresh is remote-only, so just add the extra burst.
          if (justFinishedAllRecurring) celebrate(originFromEvent(event));
          return next;
        }

        toggleTaskCompletion(userId, todayDate, t.name, t.completed)
          .then(() => {
            // Re-query the authoritative streak only AFTER the write commits,
            // so today's now-completed habit is reflected in the count.
            if (justFinishedAllRecurring) {
              celebrate(originFromEvent(event)); // extra burst for hitting 100%
              refreshStreak();
            }
          })
          .catch((err) => {
            if (isSupabaseSetupError(err)) {
              console.warn("[TodayPanel] toggle now using local-only mode.");
              setStorageMode("local");
              setNotice(
                "Supabase tables are not ready yet, so Today's tasks are running in local-only mode in this browser."
              );
              return;
            }
            console.error("[TodayPanel] toggle sync failed:", err instanceof Error ? err.message : err);
          });
        return next;
      });
    },
    [storageMode, userId, todayDate, refreshStreak]
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

  // ─── Inline edit: start / cancel / save ───
  const startEditing = useCallback((index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingValue(currentName);
    setError(null);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingIndex(null);
    setEditingValue("");
  }, []);

  const saveEditing = useCallback(
    async (index: number) => {
      const target = tasks[index];
      const trimmed = editingValue.trim();

      // No-op if empty or unchanged.
      if (!trimmed || trimmed === target.name) {
        cancelEditing();
        return;
      }

      // Guard against duplicate names in local state.
      if (
        tasks.some(
          (t, i) => i !== index && t.name.toLowerCase() === trimmed.toLowerCase()
        )
      ) {
        setError("A task with that name already exists for today.");
        return;
      }

      const previousName = target.name;

      // Optimistic update
      setTasks((prev) =>
        prev.map((t, i) => (i === index ? { ...t, name: trimmed } : t))
      );
      cancelEditing();

      if (storageMode === "local") return;

      // If the row has no DB id yet, nothing to sync server-side.
      if (!target.id) {
        console.warn("[TodayPanel] edit skipped sync: task has no DB id yet.");
        return;
      }

      try {
        await renameTask(userId, target.id, trimmed);
      } catch (err) {
        if (isSupabaseSetupError(err)) {
          console.warn("[TodayPanel] edit now using local-only mode.");
          setStorageMode("local");
          setNotice(
            "Supabase tables are not ready yet, so Today's tasks are running in local-only mode in this browser."
          );
        } else {
          console.error("[TodayPanel] edit failed:", err instanceof Error ? err.message : err);
          setError(getUserFacingError(err, "Couldn't save the edit. Please try again."));
          // Roll back optimistic rename
          setTasks((prev) =>
            prev.map((t, i) => (i === index ? { ...t, name: previousName } : t))
          );
        }
      }
    },
    [editingValue, storageMode, tasks, userId, cancelEditing]
  );
  if (!isLoaded) {
    return (
      <div className="bg-white rounded-xl border border-pink-200 p-4 flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Split tasks into the two Organizer sections, preserving each task's
  // original index so toggle/delete (which work by index) stay correct.
  const indexedTasks = tasks.map((task, index) => ({ task, index }));
  const recurringTasks = indexedTasks.filter(({ task }) => task.taskType === "recurring");
  const deadlineTasks = indexedTasks.filter(({ task }) => task.taskType === "deadline");

  // Render a single task row (shared by both sections).
  const renderTaskRow = ({ task, index }: { task: TodayTask; index: number }) => {
    const status = getDeadlineStatus(task.dueDate, todayDate);

    let dueClass = "text-rose-400";
    let dueLabel: React.ReactNode = task.dueDate ? `Due ${formatDisplayDate(task.dueDate)}` : null;
    if (status === "today") {
      dueClass = "text-orange-500 font-bold";
      dueLabel = task.dueDate ? `Due today (${formatDisplayDate(task.dueDate)})` : null;
    } else if (status === "overdue") {
      dueClass = "text-red-600 font-bold";
      dueLabel = task.dueDate ? (
        <span className="inline-flex items-center gap-0.5">
          <AlertTriangle className="w-2.5 h-2.5" /> Overdue · {formatDisplayDate(task.dueDate)}
        </span>
      ) : null;
    }

    const isEditing = editingIndex === index;

    return (
      <li
        key={task.id ?? `temp-${task.name}-${index}`}
        className="flex items-center gap-2 group rounded-lg hover:bg-pink-50 px-1.5 py-1 transition-colors"
      >
        {isEditing ? (
          /* ─── Inline edit mode ─── */
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="text"
              value={editingValue}
              autoFocus
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveEditing(index);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEditing();
                }
              }}
              className="flex-1 text-xs border border-pink-300 focus:border-pink-500 focus:outline-none rounded-md px-2 py-1 text-pink-700"
            />
            <button
              onClick={() => saveEditing(index)}
              className="text-green-500 hover:text-green-600 shrink-0 transition-colors"
              aria-label="Save edit"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={cancelEditing}
              className="text-pink-300 hover:text-rose-500 shrink-0 transition-colors"
              aria-label="Cancel edit"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ─── Display mode ─── */
          <>
            <button
              onClick={(e) => handleToggle(index, e)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              {task.completed ? (
                <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0 fill-pink-100" />
              ) : (
                <Circle className="w-4 h-4 text-pink-300 shrink-0" />
              )}
              <span className="flex flex-col">
                <span
                  className={`text-xs leading-tight select-none transition-colors ${
                    task.completed
                      ? "text-pink-500 line-through decoration-pink-300"
                      : "text-pink-600"
                  }`}
                >
                  {task.name}
                </span>
                {task.taskType === "deadline" && dueLabel && (
                  <span className={`text-[9px] mt-0.5 ${dueClass}`}>{dueLabel}</span>
                )}
              </span>
            </button>
            <button
              onClick={() => startEditing(index, task.name)}
              className="text-pink-300 hover:text-pink-600 shrink-0 transition-colors"
              aria-label={`Edit ${task.name}`}
              title="Edit task"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(index)}
              className="text-pink-300 hover:text-rose-500 shrink-0 transition-colors"
              aria-label={`Delete ${task.name}`}
              title="Remove task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-pink-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white px-4 py-2.5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Today</p>
          <p className="text-[11px] opacity-90">{formatDisplayDate(todayDate)}</p>
        </div>
        {totalCount > 0 && (
          <span className="text-xs font-semibold bg-white/20 rounded-full px-2.5 py-1">
            {doneCount}/{totalCount} done
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

        {/* ─── Today's Task Progress Overview ─── */}
        {totalCount > 0 && (
          <div className="flex items-center gap-3 bg-pink-50/60 border border-pink-100 rounded-xl p-3">
            {/* Mini pie */}
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#fce7f3" strokeWidth="5" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="#ec4899" strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${(progressPercent / 100) * 2 * Math.PI * 15.5} ${2 * Math.PI * 15.5}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold text-pink-600">{progressPercent}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-pink-700">Today&apos;s Progress</p>
              <p className="text-[11px] text-pink-500">
                {doneCount} of {totalCount} tasks completed
              </p>
              <div className="mt-1.5 h-2 bg-pink-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    background: "linear-gradient(90deg, #f9a8d4, #ec4899)",
                  }}
                />
              </div>
            </div>
          </div>
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
          <div className="space-y-3">
            {/* ─── Recurring Habits ─── */}
            <div className="rounded-xl border border-pink-200 overflow-hidden">
              <div className="bg-pink-100/70 px-3 py-1.5 flex items-center justify-between">
                <h4 className="text-xs font-bold text-pink-700">🔄 Recurring Habits</h4>
                <span className="text-[10px] text-pink-500 font-semibold">
                  {recurringTasks.filter(({ task }) => task.completed).length}/{recurringTasks.length}
                </span>
              </div>
              {recurringTasks.length > 0 ? (
                <ul className="p-2 space-y-1.5">{recurringTasks.map(renderTaskRow)}</ul>
              ) : (
                <p className="text-[11px] text-pink-300 px-3 py-3 text-center">
                  No recurring habits today.
                </p>
              )}
            </div>

            {/* ─── Critical Deadlines ─── */}
            <div className="rounded-xl border border-rose-200 overflow-hidden">
              <div className="bg-rose-100/70 px-3 py-1.5 flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-700">🚨 Critical Deadlines</h4>
                <span className="text-[10px] text-rose-500 font-semibold">
                  {deadlineTasks.filter(({ task }) => task.completed).length}/{deadlineTasks.length}
                </span>
              </div>
              {deadlineTasks.length > 0 ? (
                <ul className="p-2 space-y-1.5">{deadlineTasks.map(renderTaskRow)}</ul>
              ) : (
                <p className="text-[11px] text-rose-300 px-3 py-3 text-center">
                  No deadlines today. Nice and clear!
                </p>
              )}
            </div>
          </div>
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
