"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { calculateRecurringStreak } from "@/lib/supabase/crud";

// ════════════════════════════════════════════════════════
//  Streak Context
//
//  Shares the live recurring-habit streak between the header
//  badge and the interactive task panels. The header reads the
//  value; TodayPanel triggers refreshes when habits change.
// ════════════════════════════════════════════════════════

interface StreakContextValue {
  streak: number;
  /** Re-query Supabase for the authoritative streak value. */
  refreshStreak: () => Promise<void>;
  /** Optimistically set the streak (e.g. instant +1 on completion). */
  setStreak: (value: number) => void;
}

const StreakContext = createContext<StreakContextValue | null>(null);

interface StreakProviderProps {
  userId: string | null | undefined;
  todayDate: string | undefined;
  children: ReactNode;
}

export function StreakProvider({ userId, todayDate, children }: StreakProviderProps) {
  const [streak, setStreak] = useState(0);
  const loadedRef = useRef(false);

  const refreshStreak = useCallback(async () => {
    if (!userId || !todayDate) return;
    const value = await calculateRecurringStreak(userId, todayDate);
    setStreak(value);
  }, [userId, todayDate]);

  // Initial load.
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    refreshStreak();
  }, [refreshStreak]);

  return (
    <StreakContext.Provider value={{ streak, refreshStreak, setStreak }}>
      {children}
    </StreakContext.Provider>
  );
}

/**
 * Access the streak context. Returns a safe no-op default when used outside a
 * provider (e.g. preview mode), so components never crash.
 */
export function useStreak(): StreakContextValue {
  const ctx = useContext(StreakContext);
  if (!ctx) {
    return { streak: 0, refreshStreak: async () => {}, setStreak: () => {} };
  }
  return ctx;
}
