"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { DayData } from "@/lib/dummy-data";

interface DayColumnProps {
  day: DayData;
  dayIndex: number;
  onToggleTask: (dayIndex: number, taskIndex: number) => void;
}

export default function DayColumn({ day, dayIndex, onToggleTask }: DayColumnProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (day.completionPercent / 100) * circumference;

  return (
    <div className="bg-white dark:bg-[#1e1b24] rounded-xl border border-pink-200 dark:border-pink-900/40 flex flex-col overflow-hidden h-full">
      {/* Day Header */}
      <div className="bg-pink-400 dark:bg-pink-600 text-white text-center py-2 px-2">
        <p className="text-xs font-bold">{day.dayName}</p>
        <p className="text-[10px] opacity-90">{day.date}</p>
      </div>

      {/* Circle Progress */}
      <div className="flex justify-center py-3">
        <div className="relative w-16 h-16">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 70 70">
            <circle
              cx="35"
              cy="35"
              r={radius}
              fill="none"
              stroke="var(--donut-track, #fce7f3)"
              strokeWidth="5"
            />
            <circle
              cx="35"
              cy="35"
              r={radius}
              fill="none"
              stroke="#ec4899"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-pink-600 dark:text-pink-300">
              {day.completionPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Tasks Label */}
      <div className="px-2">
        <p className="text-[11px] font-bold text-pink-700 dark:text-pink-300 mb-1.5 border-b border-pink-100 dark:border-pink-900/40 pb-1">
          Tasks
        </p>
      </div>

      {/* Task List – clickable checkboxes */}
      <div className="flex-1 px-2 overflow-y-auto max-h-48 scrollbar-thin">
        <ul className="space-y-1 pb-2">
          {day.tasks.map((task, ti) => (
            <li
              key={ti}
              className="flex items-start gap-1.5 cursor-pointer group"
              onClick={() => onToggleTask(dayIndex, ti)}
            >
              {task.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-pink-400 mt-0.5 shrink-0 fill-pink-100 dark:fill-pink-900/40 group-hover:text-pink-600 transition-colors" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-pink-300 dark:text-pink-700 mt-0.5 shrink-0 group-hover:text-pink-500 transition-colors" />
              )}
              <span
                className={`text-[10px] leading-tight select-none transition-colors ${
                  task.completed
                    ? "text-pink-500 line-through decoration-pink-300"
                    : "text-pink-400 dark:text-pink-300 group-hover:text-pink-600"
                }`}
              >
                {task.name}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Done / Left Footer */}
      <div className="border-t border-pink-100 dark:border-pink-900/40 px-2 py-1.5 mt-auto">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-pink-600 dark:text-pink-300 font-semibold">Done</span>
            <span className="text-pink-400">🐻</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-pink-400">🐻</span>
            <span className="text-pink-600 dark:text-pink-300 font-semibold">Left</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm font-bold text-pink-700 dark:text-pink-300 -mt-0.5">
          <span>{day.done}</span>
          <span>{day.left}</span>
        </div>
      </div>
    </div>
  );
}
