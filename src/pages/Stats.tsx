import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Users,
  CheckSquare,
  Square,
  Pin,
  FileText,
  FolderOpen,
  Timer,
  Archive,
} from "lucide-react";

export function Stats() {
  const stats = useQuery(api.stats.getStats);

  // Format large numbers with commas
  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return "—";
    return num.toLocaleString("en-US");
  };

  // Calculate percentage
  const calculatePercentage = (part: number | undefined, total: number | undefined) => {
    if (part === undefined || total === undefined || total === 0) return "0";
    return ((part / total) * 100).toFixed(1);
  };

  const statCards = [
    {
      title: "Total Users",
      value: formatNumber(stats?.totalUsers),
      icon: Users,
      color: "#EB5601",
      description: "Registered users",
    },
    {
      title: "Todos Created",
      value: formatNumber(stats?.totalTodos),
      icon: Square,
      color: "#EB5601",
      description: "All todos ever created",
    },
    {
      title: "Todos Completed",
      value: formatNumber(stats?.completedTodos),
      icon: CheckSquare,
      color: "#8b7355",
      description: `${calculatePercentage(stats?.completedTodos, stats?.totalTodos)}% completion rate`,
    },
    {
      title: "Active Todos",
      value: formatNumber(stats?.activeTodos),
      icon: Square,
      color: "#EB5601",
      description: "Currently active and incomplete",
    },
    {
      title: "Pinned Todos",
      value: formatNumber(stats?.pinnedTodos),
      icon: Pin,
      color: "#EB5601",
      description: "Pinned to top",
    },
    {
      title: "Archived Todos",
      value: formatNumber(stats?.archivedTodos),
      icon: Archive,
      color: "#6b6b6b",
      description: "Archived todos",
    },
    {
      title: "Full-Page Notes",
      value: formatNumber(stats?.totalFullPageNotes),
      icon: FileText,
      color: "#EB5601",
      description: "Full-page notes created",
    },
    {
      title: "Todo Notes",
      value: formatNumber(stats?.totalNotes),
      icon: FileText,
      color: "#8b7355",
      description: "Regular notes attached to todos",
    },
    {
      title: "Pomodoro Sessions",
      value: formatNumber(stats?.pomodoroSessions),
      icon: Timer,
      color: "#EB5601",
      description: "Timer sessions started",
    },
    {
      title: "Folders",
      value: formatNumber(stats?.totalFolders),
      icon: FolderOpen,
      color: "#8b7355",
      description: "Organizational folders",
    },
  ];

  return (
    <div className="stats-page" data-theme="tan">
      <div className="stats-container">
        <header className="stats-header">
          <h1 className="stats-title">Better Todo Statistics</h1>
          <p className="stats-subtitle">
            Aggregate statistics across all users. No personal data is shown.
          </p>
        </header>

        <div className="stats-grid">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="stats-card">
                <div className="stats-card-header">
                  <div
                    className="stats-card-icon"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <Icon size={20} color={card.color} />
                  </div>
                  <div className="stats-card-title">{card.title}</div>
                </div>
                <div className="stats-card-value">{card.value}</div>
                <div className="stats-card-description">{card.description}</div>
              </div>
            );
          })}
        </div>

        {stats && (
          <div className="stats-summary">
            <div className="stats-summary-card">
              <h3 className="stats-summary-title">Summary</h3>
              <div className="stats-summary-grid">
                <div className="stats-summary-item">
                  <span className="stats-summary-label">Total Items</span>
                  <span className="stats-summary-value">
                    {formatNumber(
                      (stats.totalTodos || 0) +
                        (stats.totalNotes || 0) +
                        (stats.totalFullPageNotes || 0),
                    )}
                  </span>
                </div>
                <div className="stats-summary-item">
                  <span className="stats-summary-label">Completion Rate</span>
                  <span className="stats-summary-value">
                    {calculatePercentage(stats.completedTodos, stats.totalTodos)}%
                  </span>
                </div>
                <div className="stats-summary-item">
                  <span className="stats-summary-label">Active Rate</span>
                  <span className="stats-summary-value">
                    {calculatePercentage(stats.activeTodos, stats.totalTodos)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

