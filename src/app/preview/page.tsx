import { LogOut, User } from "lucide-react";
import DashboardClient from "@/components/dashboard/DashboardClient";

/**
 * Static preview of the interactive dashboard.
 * Uses dummy data — no Supabase required (userId = null → preview mode).
 * Visit /preview to see the full interactive UI.
 */
export default function PreviewPage() {
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
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-pink-200 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-pink-600" />
              </div>
              <span className="text-xs font-medium text-pink-600">Preview User</span>
            </div>
            <button className="flex items-center gap-1.5 text-xs font-medium text-pink-500 hover:text-pink-700 transition-colors bg-pink-50 hover:bg-pink-100 rounded-lg px-3 py-1.5">
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Interactive Dashboard (Preview Mode — no Supabase sync) ─── */}
      <DashboardClient userId={null} />
    </div>
  );
}
