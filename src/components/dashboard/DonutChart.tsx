"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DonutChartProps {
  percent: number;
  completed: number;
  total: number;
}

export default function DonutChart({ percent, completed, total }: DonutChartProps) {
  const data = [
    { name: "Done", value: percent },
    { name: "Left", value: 100 - percent },
  ];

  return (
    <div className="bg-white rounded-xl border border-pink-200 p-4 h-full flex flex-col items-center justify-center">
      <div className="relative w-32 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={55}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
              animationDuration={800}
            >
              <Cell fill="url(#donutGrad)" />
              <Cell fill="#fce7f3" />
            </Pie>
            <defs>
              <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f9a8d4" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </PieChart>
        </ResponsiveContainer>

        {/* Center text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-pink-600">{percent}%</span>
        </div>
      </div>

      <p className="text-xs text-pink-500 mt-1 font-medium">
        {completed} / {total} completed
      </p>
    </div>
  );
}
