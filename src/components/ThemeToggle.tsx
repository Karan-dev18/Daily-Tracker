"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Sun/Moon toggle button for switching between light and dark themes.
 *
 * Uses a `mounted` guard: the theme is only known on the client (it depends on
 * localStorage / the pre-hydration script), so rendering the icon during SSR
 * would cause a hydration mismatch. We render a same-size placeholder until
 * after mount, then swap in the real icon.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Same-size placeholder before mount to avoid layout shift + hydration mismatch.
  if (!mounted) {
    return <div className="w-8 h-8 shrink-0" aria-hidden="true" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors
        bg-pink-50 hover:bg-pink-100 text-pink-500
        dark:bg-pink-950/40 dark:hover:bg-pink-900/40 dark:text-pink-300"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
