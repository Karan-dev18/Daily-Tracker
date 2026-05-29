import { Sparkles } from "lucide-react";

export default function DashboardHeader() {
  return (
    <div className="w-full bg-pink-200/60 border-b-2 border-pink-300/50 py-3 px-6">
      <h1 className="text-center text-pink-700 font-bold text-base md:text-lg flex items-center justify-center gap-2 tracking-wide">
        <Sparkles className="w-5 h-5 text-pink-400" />
        <span>pov: you feel so distracted from your goals you decide to lock in</span>
        <Sparkles className="w-5 h-5 text-pink-400" />
      </h1>
    </div>
  );
}
