import { CheckSquare, Square } from "lucide-react";
import { habitsData } from "@/lib/dummy-data";

const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function HabitTracker() {
  return (
    <div className="bg-white rounded-xl border border-pink-200 p-4 overflow-x-auto">
      <h3 className="text-sm font-bold text-pink-700 text-center mb-4">
        Habit Tracker
      </h3>

      <table className="w-full min-w-[640px]">
        <thead>
          <tr>
            <th className="text-left text-[11px] font-bold text-pink-700 pb-2 pr-4 w-36">
              Habit
            </th>
            {dayHeaders.map((d) => (
              <th
                key={d}
                className="text-center text-[11px] font-bold text-pink-600 pb-2 w-12"
              >
                {d}
              </th>
            ))}
            <th className="text-center text-[11px] font-bold text-pink-700 pb-2 pl-4 w-28">
              Progress
            </th>
          </tr>
        </thead>
        <tbody>
          {habitsData.map((habit) => (
            <tr key={habit.name} className="border-t border-pink-50">
              <td className="text-[11px] text-pink-600 py-1.5 pr-4 font-medium">
                {habit.name}
              </td>
              {habit.days.map((done, di) => (
                <td key={di} className="text-center py-1.5">
                  {done ? (
                    <CheckSquare className="w-4 h-4 text-pink-400 mx-auto fill-pink-100" />
                  ) : (
                    <Square className="w-4 h-4 text-pink-200 mx-auto" />
                  )}
                </td>
              ))}
              <td className="py-1.5 pl-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-pink-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${habit.progress}%`,
                        background: "linear-gradient(90deg, #f9a8d4, #ec4899)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-pink-500 font-semibold w-8 text-right">
                    {habit.progress}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
