"use client";

import { useStreak } from "@/components/dashboard/StreakContext";

/**
 * Fire 🔥 streak badge for the dashboard header.
 * Reads the live streak from StreakContext. Hidden when the streak is 0
 * so the header stays clean until the user builds momentum.
 */
export default function StreakBadge() {
  const { streak } = useStreak();

  if (streak <= 0) return null;

  return (
    <span
      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-sm bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 animate-in fade-in"
      title={`${streak}-day recurring-habit streak`}
      aria-label={`Current streak: ${streak} ${streak === 1 ? "day" : "days"}`}
    >
      <span className="text-sm leading-none">🔥</span>
      {streak} {streak === 1 ? "day" : "days"}
    </span>
  );
}
