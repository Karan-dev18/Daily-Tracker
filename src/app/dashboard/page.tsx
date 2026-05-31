import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { LogOut, User } from "lucide-react";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { StreakProvider } from "@/components/dashboard/StreakContext";
import StreakBadge from "@/components/dashboard/StreakBadge";

/**
 * Authenticated dashboard page.
 * Server component that fetches the user, then renders
 * the interactive DashboardClient with the userId for Supabase sync.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  // Compute current week's Monday in ISO format
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekStartDate = monday.toISOString().split("T")[0];

  // Today's date in ISO format (server-computed to avoid hydration mismatch)
  const todayDate = now.toISOString().split("T")[0];

  return (
    <StreakProvider userId={user?.id} todayDate={todayDate}>
    <div className="min-h-screen bg-pink-50">
      {/* ─── Top Nav Bar ─── */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-pink-200 sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
              </svg>
            </div>
            <span className="text-sm font-bold text-pink-700">Daily Tracker</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <StreakBadge />
              <div className="w-6 h-6 rounded-full bg-pink-200 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-pink-600" />
              </div>
              <span className="text-xs font-medium text-pink-600">{displayName}</span>
            </div>
            <form action={signOut}>
              <button type="submit" id="signout-btn" className="flex items-center gap-1.5 text-xs font-medium text-pink-500 hover:text-pink-700 transition-colors bg-pink-50 hover:bg-pink-100 rounded-lg px-3 py-1.5">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* ─── Interactive Dashboard ─── */}
      <DashboardClient userId={user?.id} weekStartDate={weekStartDate} todayDate={todayDate} />
    </div>
    </StreakProvider>
  );
}
