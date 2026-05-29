import { overallPercent, totalCompleted, totalTasks } from "@/lib/dummy-data";

export default function DonutChart() {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (overallPercent / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-pink-200 p-4 h-full flex flex-col items-center justify-center">
      {/* SVG Donut */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#fce7f3"
            strokeWidth="10"
          />
          {/* Progress arc */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="url(#donutGradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f9a8d4" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-pink-600">{overallPercent}%</span>
        </div>
      </div>

      {/* Completed label */}
      <p className="text-xs text-pink-500 mt-2 font-medium">
        {totalCompleted} / {totalTasks} completed
      </p>
    </div>
  );
}
