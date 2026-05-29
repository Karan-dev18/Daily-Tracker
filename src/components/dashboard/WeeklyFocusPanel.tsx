import { Target, Gift, Heart } from "lucide-react";
import { weeklyFocus, weeklyReward, weeklyAffirmation } from "@/lib/dummy-data";

export default function WeeklyFocusPanel() {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Weekly Focus */}
      <div className="bg-white rounded-xl border border-pink-200 p-4 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-bold text-pink-700">Weekly focus</h3>
          <Target className="w-4 h-4 text-pink-400" />
        </div>
        <p className="text-sm text-pink-600">{weeklyFocus}</p>
      </div>

      {/* Reward */}
      <div className="bg-white rounded-xl border border-pink-200 p-4 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-bold text-pink-700">Reward</h3>
          <Gift className="w-4 h-4 text-pink-400" />
        </div>
        <p className="text-sm text-pink-600">{weeklyReward}</p>
      </div>

      {/* Affirmation */}
      <div className="bg-white rounded-xl border border-pink-200 p-4 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-bold text-pink-700">Affirmation</h3>
          <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
        </div>
        <p className="text-sm text-pink-600 italic">{weeklyAffirmation}</p>
      </div>
    </div>
  );
}
