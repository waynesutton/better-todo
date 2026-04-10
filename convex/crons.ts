import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check every hour if any user's local time is Friday 2pm for weekly recap
crons.interval("weekly recap tick", { hours: 1 }, internal.weeklyRecap.tick, {});

export default crons;
