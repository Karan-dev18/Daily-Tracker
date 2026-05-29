import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-mesh-gradient flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        <div className="fade-in-up mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-400 to-pink-600 shadow-xl shadow-pink-300/40 mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-pink-600 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent mb-4 fade-in-up delay-100">
          Daily Tracker
        </h1>

        <p className="text-lg md:text-xl text-pink-500 font-medium mb-3 fade-in-up delay-200">
          Your Pink Productivity Companion ✨
        </p>

        <p className="text-pink-400 max-w-md mx-auto mb-10 leading-relaxed fade-in-up delay-300">
          Track your daily tasks, build lasting habits, set weekly goals, and evaluate your monthly progress — all wrapped in a beautiful pink experience.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-10 fade-in-up delay-300">
          {["📋 Tasks", "🎯 Goals", "💪 Habits", "📊 Reviews"].map((f) => (
            <span key={f} className="px-4 py-2 rounded-full glass-card text-sm font-medium text-pink-600">{f}</span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-in-up delay-400">
          <Link href="/signup" className="btn-primary text-lg px-8 py-3.5">Get Started Free</Link>
          <Link href="/login" className="btn-outline text-lg px-8 py-3.5">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
