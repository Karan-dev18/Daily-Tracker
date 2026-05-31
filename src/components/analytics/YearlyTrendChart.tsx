"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface YearlyTrendChartProps {
  yearlyData: { month: string; score: number }[];
  year: number;
  onYearChange: (year: number) => void;
  currentMonth: string;
  onMonthClick: (monthYear: string) => void;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function YearlyTrendChart({
  yearlyData,
  year,
  onYearChange,
  currentMonth,
  onMonthClick,
}: YearlyTrendChartProps) {
  const chartData = yearlyData.map((d, i) => ({
    month: MONTH_LABELS[i],
    monthYear: d.month,
    score: d.score >= 0 ? d.score : null,
    isCurrent: d.month === currentMonth,
  }));

  const currentYear = new Date().getFullYear();

  // Custom dot that highlights the currently viewed month
  const renderDot = (props: { cx: number; cy: number; payload: typeof chartData[0] }) => {
    if (!props.payload || props.payload.score === null) return null;
    const isCurrent = props.payload.isCurrent;
    return (
      <circle
        cx={props.cx}
        cy={props.cy}
        r={isCurrent ? 5 : 3}
        fill={isCurrent ? "#db2777" : "#ec4899"}
        stroke="white"
        strokeWidth={isCurrent ? 2 : 1}
        style={{ cursor: "pointer" }}
      />
    );
  };

  return (
    <div className="bg-white rounded-xl border border-pink-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-pink-700">Yearly Trend</h3>

        {/* Year Picker */}
        <div className="flex items-center gap-1.5 bg-pink-50 rounded-lg px-2 py-0.5">
          <button
            onClick={() => onYearChange(year - 1)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-pink-100 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-pink-500" />
          </button>
          <span className="text-xs font-bold text-pink-700 w-10 text-center">{year}</span>
          <button
            onClick={() => onYearChange(year + 1)}
            disabled={year >= currentYear}
            className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
              year >= currentYear ? "text-pink-200" : "hover:bg-pink-100 text-pink-500"
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
          <defs>
            <linearGradient id="yearlyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ec4899" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "#ec4899", fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 10, fill: "#f9a8d4" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: "white",
              border: "1px solid #fbcfe8",
              borderRadius: "8px",
              fontSize: "11px",
            }}
            formatter={(value: unknown) =>
              value !== null && value !== undefined ? [`${value}%`, "Score"] : ["No data", "Score"]
            }
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#ec4899"
            strokeWidth={2}
            fill="url(#yearlyGrad)"
            dot={renderDot as unknown as boolean}
            connectNulls={false}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Clickable month pills */}
      <div className="flex gap-1 mt-3 justify-center flex-wrap">
        {chartData.map((d) => (
          <button
            key={d.monthYear}
            onClick={() => d.score !== null && onMonthClick(d.monthYear)}
            disabled={d.score === null}
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
              d.isCurrent
                ? "bg-pink-500 text-white"
                : d.score !== null
                ? "bg-pink-50 text-pink-500 hover:bg-pink-100"
                : "bg-gray-50 text-gray-300 cursor-not-allowed"
            }`}
          >
            {d.month}
          </button>
        ))}
      </div>
    </div>
  );
}
