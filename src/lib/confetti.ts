import confetti from "canvas-confetti";

// Pink + white palette to match the app theme.
const PINK_WHITE = ["#ec4899", "#f472b6", "#f9a8d4", "#fce7f3", "#ffffff"];

/**
 * Fire a celebratory burst of pink-and-white confetti.
 *
 * @param origin Optional normalized origin { x, y } in the 0–1 range
 *               (e.g. from a click position). Defaults to screen center.
 */
export function celebrate(origin?: { x: number; y: number }) {
  // Respect reduced-motion preferences.
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const x = origin?.x ?? 0.5;
  const y = origin?.y ?? 0.5;

  // Main burst
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 45,
    origin: { x, y },
    colors: PINK_WHITE,
    scalar: 0.9,
    ticks: 200,
  });

  // Two side bursts for a fuller explosion
  confetti({
    particleCount: 40,
    angle: 60,
    spread: 55,
    origin: { x: Math.max(0, x - 0.15), y },
    colors: PINK_WHITE,
    scalar: 0.8,
  });
  confetti({
    particleCount: 40,
    angle: 120,
    spread: 55,
    origin: { x: Math.min(1, x + 0.15), y },
    colors: PINK_WHITE,
    scalar: 0.8,
  });
}

/**
 * Convert a mouse/pointer event into a normalized confetti origin.
 */
export function originFromEvent(
  e: { clientX: number; clientY: number } | undefined
): { x: number; y: number } | undefined {
  if (!e || typeof window === "undefined") return undefined;
  return {
    x: e.clientX / window.innerWidth,
    y: e.clientY / window.innerHeight,
  };
}
