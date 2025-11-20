import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  Moon,
  Sun,
  Cloud,
  CheckSquare,
  Square,
  Pin,
  FileText,
  FolderOpen,
  Timer,
  Archive,
} from "lucide-react";
import { Half2Icon } from "@radix-ui/react-icons";
import { triggerSelectionHaptic } from "../lib/haptics";

export function StreaksPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const streakStatus = useQuery(api.streaks.getStreakStatus);
  const badges = useQuery(api.streaks.getBadges);
  const userStats = useQuery(api.stats.getUserStats);
  const markBadgesAsSeen = useMutation(api.streaks.markBadgesAsSeen);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );

  // Mark badges as seen when page loads
  useEffect(() => {
    if (streakStatus?.hasUnseenBadges) {
      markBadgesAsSeen();
    }
  }, [streakStatus?.hasUnseenBadges, markBadgesAsSeen]);

  if (!streakStatus || !badges) {
    return (
      <div className="streaks-page">
        <div className="streaks-loading">Loading streaks...</div>
      </div>
    );
  }

  const availableYears = Array.from(
    new Set(badges.map((badge) => new Date(badge.earnedAt).getFullYear())),
  ).sort((a, b) => b - a);

  if (availableYears.length === 0) {
    availableYears.push(new Date().getFullYear());
  }

  const filteredBadges = badges.filter(
    (badge) => new Date(badge.earnedAt).getFullYear() === selectedYear,
  );

  // Calculate completion rate
  const totalDaysTracked = Object.keys(
    streakStatus.weeklyProgress || {},
  ).length;
  const completedDays = Object.values(streakStatus.weeklyProgress || {}).filter(
    (completed) => completed === true,
  ).length;
  const completionRate =
    totalDaysTracked > 0
      ? Math.round((completedDays / totalDaysTracked) * 100)
      : 0;

  // Get current week days
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekStatus = weekDays.map((day, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - currentDay + index);
    const dateStr = date.toISOString().split("T")[0];
    const progress = streakStatus.weeklyProgress as Record<string, boolean>;
    return {
      day,
      completed: progress[dateStr] === true,
      isToday: index === currentDay,
      isFuture: index > currentDay,
    };
  });

  // Calculate next milestone
  const milestones = [3, 5, 7, 10, 30, 60, 90, 365];
  const nextMilestone =
    milestones.find((m) => m > streakStatus.currentStreak) || 365;
  const progressToNext = streakStatus.currentStreak;
  const progressPercent = (progressToNext / nextMilestone) * 100;

  // Format numbers
  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return "—";
    return num.toLocaleString("en-US");
  };

  // Calculate percentage
  const calculatePercentage = (
    part: number | undefined,
    total: number | undefined,
  ) => {
    if (part === undefined || total === undefined || total === 0) return "0";
    return ((part / total) * 100).toFixed(1);
  };

  // Mini stats cards data (excluding Total Users)
  const miniStatCards = [
    {
      title: "Todos Created",
      value: formatNumber(userStats?.totalTodos),
      icon: Square,
    },
    {
      title: "Completed",
      value: formatNumber(userStats?.completedTodos),
      icon: CheckSquare,
      subtitle: `${calculatePercentage(userStats?.completedTodos, userStats?.totalTodos)}% completion rate`,
    },
    {
      title: "Active",
      value: formatNumber(userStats?.activeTodos),
      icon: Square,
    },
    {
      title: "Pinned",
      value: formatNumber(userStats?.pinnedTodos),
      icon: Pin,
    },
    {
      title: "Archived",
      value: formatNumber(userStats?.archivedTodos),
      icon: Archive,
    },
    {
      title: "Full-Page Notes",
      value: formatNumber(userStats?.totalFullPageNotes),
      icon: FileText,
    },
    {
      title: "Todo Notes",
      value: formatNumber(userStats?.totalNotes),
      icon: FileText,
    },
    {
      title: "Pomodoro Sessions",
      value: formatNumber(userStats?.pomodoroSessions),
      icon: Timer,
    },
    {
      title: "Folders",
      value: formatNumber(userStats?.totalFolders),
      icon: FolderOpen,
    },
  ];

  return (
    <div className="streaks-page">
      {/* Header */}
      <div className="streaks-header">
        <button
          className="streaks-app-name"
          onClick={() => {
            triggerSelectionHaptic();
            navigate("/");
          }}
          title="Back to todos"
        >
          better todo
        </button>
        <div className="streaks-header-right">
          <button
            className="streaks-theme-toggle"
            onClick={() => {
              triggerSelectionHaptic();
              toggleTheme();
            }}
            title={`Switch to ${theme === "dark" ? "light" : theme === "light" ? "tan" : theme === "tan" ? "cloud" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun size={16} />
            ) : theme === "light" ? (
              <Cloud size={16} />
            ) : theme === "tan" ? (
              <Half2Icon style={{ width: 16, height: 16 }} />
            ) : (
              <Moon size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="streaks-two-column">
        {/* Left Column - Current Streak */}
        <div className="streaks-column-left">
          {/* Main Streak Card */}
          <div className="streaks-current">
            <div className="streaks-current-number">
              {streakStatus.currentStreak}
            </div>
            <div className="streaks-current-label">Day Streak</div>
            <div className="streaks-stats">
              <div className="streaks-stat">
                <span className="streaks-stat-label">Longest</span>
                <span className="streaks-stat-value">
                  {streakStatus.longestStreak}
                </span>
              </div>
              <div className="streaks-stat">
                <span className="streaks-stat-label">Total Completed</span>
                <span className="streaks-stat-value">
                  {streakStatus.totalTodosCompleted}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="streaks-week-card">
            <div className="streaks-week-title">This Week</div>
            <div className="streaks-week-days">
              {weekStatus.map((day, index) => (
                <div
                  key={index}
                  className={`streaks-week-day ${day.completed ? "completed" : ""} ${day.isToday ? "today" : ""} ${day.isFuture ? "future" : ""}`}
                >
                  <div className="streaks-week-day-label">{day.day}</div>
                  <div className="streaks-week-day-indicator" />
                </div>
              ))}
            </div>
          </div>

          {/* Completion Rate */}
          <div className="streaks-metric-card">
            <div className="streaks-metric-label">Completion Rate</div>
            <div className="streaks-metric-value">{completionRate}%</div>
            <div className="streaks-metric-bar">
              <div
                className="streaks-metric-bar-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="streaks-metric-subtitle">
              {completedDays} of {totalDaysTracked} days
            </div>
          </div>

          {/* Next Milestone */}
          <div className="streaks-metric-card">
            <div className="streaks-metric-label">Next Milestone</div>
            <div className="streaks-metric-value">{nextMilestone} Days</div>
            <div className="streaks-metric-bar">
              <div
                className="streaks-metric-bar-fill"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <div className="streaks-metric-subtitle">
              {progressToNext} / {nextMilestone} days
            </div>
          </div>
        </div>

        {/* Right Column - Badges */}
        <div className="streaks-column-right">
          <div className="streaks-badges">
            <h2 className="streaks-badges-title">Badges</h2>
            {filteredBadges.length === 0 ? (
              <div className="streaks-no-badges">
                Complete todos to earn badges
              </div>
            ) : (
              <div className="streaks-badges-grid">
                {filteredBadges.map((badge) => (
                  <div key={badge._id} className="streaks-badge">
                    <img
                      src={badge.imageUrl}
                      alt={badge.name}
                      className="streaks-badge-image"
                    />
                    <div className="streaks-badge-name">{badge.name}</div>
                    <div className="streaks-badge-description">
                      {badge.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mini Stats Section */}
      <div className="streaks-mini-stats">
        <h2 className="streaks-mini-stats-title">Your Stats</h2>
        <div className="streaks-mini-stats-grid">
          {miniStatCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="streaks-mini-stat-card">
                <div className="streaks-mini-stat-icon">
                  <Icon size={16} />
                </div>
                <div className="streaks-mini-stat-content">
                  <div className="streaks-mini-stat-title">{card.title}</div>
                  <div className="streaks-mini-stat-value">{card.value}</div>
                  {card.subtitle && (
                    <div className="streaks-mini-stat-subtitle">
                      {card.subtitle}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Year Selector */}
      {availableYears.length > 1 && (
        <div className="streaks-year-selector">
          <label htmlFor="year-select" className="streaks-year-label">
            View badges from:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="streaks-year-select"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
