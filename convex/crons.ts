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

export default crons;
