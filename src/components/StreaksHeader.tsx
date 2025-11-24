import { useNavigate } from "react-router-dom";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, startOfWeek } from "date-fns";

export function StreaksHeader() {
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  const streakStatus = useQuery(api.streaks.getStreakStatus);

  // Only show for authenticated users
  if (!isAuthenticated || !streakStatus) return null;

  // Get the current week (Sunday to Saturday)
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // 0 = Sunday

  // Calculate the 7 days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return format(date, "yyyy-MM-dd");
  });

  // Count incomplete days
  const incompleteDays = weekDays.filter((day) => {
    const progress = streakStatus.weeklyProgress as Record<string, boolean>;
    return !progress[day];
  }).length;

  return (
    <button
      className="streaks-header-button"
      onClick={() => navigate("/streaks")}
      title={`${streakStatus.currentStreak} day streak - ${incompleteDays} days incomplete this week`}
    >
      <img src="/rise.svg" alt="Streaks" className="streaks-icon" />
      <div className="streaks-bar-container">
        {Array.from({ length: incompleteDays }).map((_, i) => (
          <div key={i} className="streaks-bar" />
        ))}
      </div>
    </button>
  );
}
