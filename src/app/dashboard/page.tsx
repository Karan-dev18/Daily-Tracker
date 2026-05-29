import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { LogOut, User } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import WeeklyFocusPanel from "@/components/dashboard/WeeklyFocusPanel";
import OverallProgressChart from "@/components/dashboard/OverallProgressChart";
import DonutChart from "@/components/dashboard/DonutChart";
import TaskProgressOverview from "@/components/dashboard/TaskProgressOverview";
import DayColumn from "@/components/dashboard/DayColumn";
import HabitTracker from "@/components/dashboard/HabitTracker";
import { dailyData } from "@/lib/dummy-data";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  return (
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

      {/* ─── Main Dashboard Content ─── */}
      <div className="max-w-[1440px] mx-auto px-3 lg:px-5 py-4 space-y-4">

        {/* ─── Title Banner ─── */}
        <DashboardHeader />

        {/* ─── Row 1: Focus Panel + Charts ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Weekly Focus Panel */}
          <div className="lg:col-span-2">
            <WeeklyFocusPanel />
          </div>

          {/* Center: Bar Chart */}
          <div className="lg:col-span-5">
            <OverallProgressChart />
          </div>

          {/* Center-Right: Donut */}
          <div className="lg:col-span-2">
            <DonutChart />
          </div>

          {/* Right: Task Progress Overview */}
          <div className="lg:col-span-3">
            <TaskProgressOverview />
          </div>
        </div>

        {/* ─── Row 2: Daily Columns (Mon–Sun) ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {dailyData.map((day) => (
            <DayColumn key={day.dayName} day={day} />
          ))}
        </div>

        {/* ─── Row 3: Habit Tracker ─── */}
        <HabitTracker />
      </div>
    </div>
  );
}
