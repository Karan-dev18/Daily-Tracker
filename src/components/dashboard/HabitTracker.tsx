"use client";

import { CheckSquare, Square } from "lucide-react";
import type { HabitData } from "@/lib/dummy-data";

interface HabitTrackerProps {
  habits: HabitData[];
  onToggleHabit: (habitIndex: number, dayIndex: number) => void;
}

const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function HabitTracker({ habits, onToggleHabit }: HabitTrackerProps) {
  return (
    <div className="bg-white dark:bg-[#1e1b24] rounded-xl border border-pink-200 dark:border-pink-900/40 p-4 overflow-x-auto">
      <h3 className="text-sm font-bold text-pink-700 dark:text-pink-300 text-center mb-4">
        Habit Tracker
      </h3>

      <table className="w-full min-w-[640px]">
        <thead>
          <tr>
            <th className="text-left text-[11px] font-bold text-pink-700 dark:text-pink-300 pb-2 pr-4 w-36">
              Habit
            </th>
            {dayHeaders.map((d) => (
              <th
                key={d}
                className="text-center text-[11px] font-bold text-pink-600 dark:text-pink-400 pb-2 w-12"
              >
                {d}
              </th>
            ))}
            <th className="text-center text-[11px] font-bold text-pink-700 dark:text-pink-300 pb-2 pl-4 w-28">
              Progress
            </th>
          </tr>
        </thead>
        <tbody>
          {habits.map((habit, hi) => (
            <tr key={habit.name} className="border-t border-pink-50 dark:border-pink-900/30">
              <td className="text-[11px] text-pink-600 dark:text-pink-300 py-1.5 pr-4 font-medium">
                {habit.name}
              </td>
              {habit.days.map((done, di) => (
                <td key={di} className="text-center py-1.5">
                  <button
                    onClick={() => onToggleHabit(hi, di)}
                    className="hover:scale-110 transition-transform inline-flex"
                    aria-label={`Toggle ${habit.name} on ${dayHeaders[di]}`}
                  >
                    {done ? (
                      <CheckSquare className="w-4 h-4 text-pink-400 fill-pink-100 dark:fill-pink-900/40 hover:text-pink-600 transition-colors" />
                    ) : (
                      <Square className="w-4 h-4 text-pink-200 dark:text-pink-800 hover:text-pink-400 transition-colors" />
                    )}
                  </button>
                </td>
              ))}
              <td className="py-1.5 pl-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-pink-100 dark:bg-pink-950/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${habit.progress}%`,
                        background: "linear-gradient(90deg, #f9a8d4, #ec4899)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-pink-500 dark:text-pink-400 font-semibold w-8 text-right">
                    {habit.progress}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
