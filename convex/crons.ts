import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily at 12:00 UTC: remove past days that only hold the untouched
// "what's the priority?" placeholder todo so they drop off the sidebar.
crons.cron(
  "cleanup default day todos",
  "0 12 * * *",
  internal.crons_cleanup.cleanupDefaultDayTodos,
  {},
);

// Hourly at :05: end of day auto rollover. Each opted-in user is processed
// within the first hour after their local midnight (moves yesterday's
// incomplete todos to today and closes yesterday if it has no notes).
crons.cron(
  "end of day auto rollover",
  "5 * * * *",
  internal.rollover.runDailyRollover,
  {},
);

// Daily: delete connected agent (MCP) activity older than 30 days
crons.interval(
  "cleanup old mcp activity",
  { hours: 24 },
  internal.mcpActivity.cleanupOldActivity,
  {},
);

export default crons;
