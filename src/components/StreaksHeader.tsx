import { useNavigate } from "react-router-dom";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, startOfWeek } from "date-fns";

// Inline SVG component for streaks icon (matches lucide-react icon styling)
function RiseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m495.93 82.599h-163.09c-8.87 0-16.07 7.19-16.07 16.07v32.46c0 8.87 7.2 16.07 16.07 16.07h68.89l-140.96 140.95-59.76-59.76c-12.62-12.61-33.07-12.61-45.69 0l-150.61 150.63c-6.28 6.27-6.28 16.45 0 22.72l22.95 22.96c6.27 6.27 16.45 6.27 22.72 0l127.79-127.79 59.75 59.76c12.619 12.623 33.072 12.628 45.69 0l163.79-163.79v68.89c0 8.87 7.19 16.07 16.07 16.07h32.46c8.88 0 16.07-7.2 16.07-16.07v-163.1c0-8.88-7.19-16.07-16.07-16.07z" />
    </svg>
  );
}

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
      <RiseIcon size={18} />
      <div className="streaks-bar-container">
        {Array.from({ length: incompleteDays }).map((_, i) => (
          <div key={i} className="streaks-bar" />
        ))}
      </div>
    </button>
  );
}
