"use client";

import type { CategoryProgress } from "@/lib/dummy-data";

interface TaskProgressOverviewProps {
  categories: CategoryProgress[];
}

export default function TaskProgressOverview({ categories }: TaskProgressOverviewProps) {
  return (
    <div className="bg-white rounded-xl border border-pink-200 p-4 h-full">
      <h3 className="text-sm font-bold text-pink-700 mb-3">
        Task Progress Overview
      </h3>

      <div className="space-y-2.5">
        {categories.map((cat) => (
          <div key={cat.name} className="flex items-center gap-2">
            <span className="text-[11px] text-pink-600 w-20 shrink-0 truncate font-medium">
              {cat.name}
            </span>
            <div className="flex-1 h-2.5 bg-pink-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${cat.percent}%`,
                  background: "linear-gradient(90deg, #f9a8d4, #ec4899)",
                }}
              />
            </div>
            <span className="text-[11px] text-pink-500 font-semibold w-8 text-right">
              {cat.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
