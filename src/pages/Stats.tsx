import { useState, useEffect } from "react";
import { useAction } from "convex/react";
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
import { DashboardIcon, GridIcon } from "@radix-ui/react-icons";

type Stats = {
  totalUsers: number;
  totalTodos: number;
  completedTodos: number;
  pinnedTodos: number;
  totalNotes: number;
  totalFullPageNotes: number;
  activeTodos: number;
  archivedTodos: number;
  pomodoroSessions: number;
  totalFolders: number;
};

export function Stats() {
  const [viewMode, setViewMode] = useState<"grid" | "dashboard">("grid");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const getStats = useAction(api.stats.getStats);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const result = await getStats();
        setStats(result);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [getStats]);

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

  if (loading) {
    return (
      <div className="stats-page" data-theme="tan">
        <div className="stats-container">
          <header className="stats-header">
            <div className="stats-header-content">
              <div>
                <h1 className="stats-title">Better Todo Statistics</h1>
                <p className="stats-subtitle">Loading statistics...</p>
              </div>
            </div>
          </header>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page" data-theme="tan">
      <div className="stats-container">
        <header className="stats-header">
          <div className="stats-header-content">
            <div>
              <h1 className="stats-title">Better Todo Statistics</h1>
              <p className="stats-subtitle">
                Aggregate statistics across all users. No personal data is shown.
              </p>
            </div>
            <button
              className="stats-view-toggle"
              onClick={() => setViewMode(viewMode === "grid" ? "dashboard" : "grid")}
              aria-label={viewMode === "grid" ? "Switch to dashboard view" : "Switch to grid view"}
            >
              {viewMode === "grid" ? (
                <DashboardIcon width={20} height={20} />
              ) : (
                <GridIcon width={20} height={20} />
              )}
            </button>
          </div>
        </header>

        {viewMode === "grid" ? (
          <>
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
          </>
        ) : (
          <div className="stats-dashboard">
            <div className="stats-dashboard-left">
              <div className="stats-dashboard-card">
                <div className="stats-dashboard-label">Total Users</div>
                <div className="stats-dashboard-value">{formatNumber(stats?.totalUsers)}</div>
                <div className="stats-dashboard-unit">users</div>
              </div>
              <div className="stats-dashboard-card">
                <div className="stats-dashboard-label">Todos Created</div>
                <div className="stats-dashboard-value">{formatNumber(stats?.totalTodos)}</div>
                <div className="stats-dashboard-unit">todos</div>
              </div>
              <div className="stats-dashboard-card">
                <div className="stats-dashboard-label">Todos Completed</div>
                <div className="stats-dashboard-value">{formatNumber(stats?.completedTodos)}</div>
                <div className="stats-dashboard-unit">todos</div>
              </div>
              <div className="stats-dashboard-card">
                <div className="stats-dashboard-label">Active Todos</div>
                <div className="stats-dashboard-value">{formatNumber(stats?.activeTodos)}</div>
                <div className="stats-dashboard-unit">todos</div>
              </div>
            </div>

            <div className="stats-dashboard-center">
              <div className="stats-dashboard-compass">
                <div className="stats-dashboard-compass-title">STATISTICS</div>
                <div className="stats-dashboard-compass-value">
                  {formatNumber(
                    stats
                      ? (stats.totalTodos || 0) +
                          (stats.totalNotes || 0) +
                          (stats.totalFullPageNotes || 0)
                      : 0,
                  )}
                </div>
                <div className="stats-dashboard-compass-label">Total Items</div>
                <div className="stats-dashboard-compass-ring">
                  <div className="stats-dashboard-compass-mark" style={{ top: "0", left: "50%" }}>
                    N
                  </div>
                  <div className="stats-dashboard-compass-mark" style={{ top: "50%", right: "0" }}>
                    E
                  </div>
                  <div className="stats-dashboard-compass-mark" style={{ bottom: "0", left: "50%" }}>
                    S
                  </div>
                  <div className="stats-dashboard-compass-mark" style={{ top: "50%", left: "0" }}>
                    W
                  </div>
                  {[30, 60, 120, 150, 210, 240, 300, 330].map((angle, i) => {
                    const rad = ((angle - 90) * Math.PI) / 180;
                    const radius = 35;
                    const x = 50 + radius * Math.cos(rad);
                    const y = 50 + radius * Math.sin(rad);
                    return (
                      <div
                        key={i}
                        className="stats-dashboard-compass-mark small"
                        style={{
                          top: `${y}%`,
                          left: `${x}%`,
                        }}
                      >
                        {angle}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="stats-dashboard-right">
              <div className="stats-dashboard-card">
                <div className="stats-dashboard-label">Completion Rate</div>
                <div className="stats-dashboard-value">
                  {calculatePercentage(stats?.completedTodos, stats?.totalTodos)}%
                </div>
                <div className="stats-dashboard-unit">percent</div>
              </div>
              <div className="stats-dashboard-card">
                <div className="stats-dashboard-label">Active Rate</div>
                <div className="stats-dashboard-value">
                  {calculatePercentage(stats?.activeTodos, stats?.totalTodos)}%
                </div>
                <div className="stats-dashboard-unit">percent</div>
              </div>
              <div className="stats-dashboard-card">
                <div className="stats-dashboard-label">Pinned Todos</div>
                <div className="stats-dashboard-value">{formatNumber(stats?.pinnedTodos)}</div>
                <div className="stats-dashboard-unit">todos</div>
              </div>
              <div className="stats-dashboard-card">
                <div className="stats-dashboard-label">Archived Todos</div>
                <div className="stats-dashboard-value">{formatNumber(stats?.archivedTodos)}</div>
                <div className="stats-dashboard-unit">todos</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
