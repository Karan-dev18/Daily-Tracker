import { overallProgressBars } from "@/lib/dummy-data";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function OverallProgressChart() {
  const maxVal = 100;

  return (
    <div className="bg-white rounded-xl border border-pink-200 p-4 h-full">
      <h3 className="text-sm font-bold text-pink-700 text-center mb-4">
        Overall Progress
      </h3>

      <div className="flex items-end justify-between gap-2 h-36 px-2">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between h-full text-[10px] text-pink-400 pr-1 -mt-1">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>

        {/* Bars */}
        {overallProgressBars.map((val, i) => (
          <div key={i} className="flex flex-col items-center flex-1 h-full justify-end">
            <div className="w-full flex justify-center h-full items-end">
              <div
                className="w-6 md:w-8 rounded-t-md transition-all duration-500"
                style={{
                  height: `${(val / maxVal) * 100}%`,
                  background:
                    val > 0
                      ? "linear-gradient(180deg, #f472b6 0%, #ec4899 50%, #db2777 100%)"
                      : "#fce7f3",
                  minHeight: val > 0 ? "4px" : "2px",
                }}
              />
            </div>
            <span className="text-[10px] text-pink-500 mt-1.5 font-medium">
              {dayLabels[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
