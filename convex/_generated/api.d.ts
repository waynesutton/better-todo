/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentTaskActions from "../agentTaskActions.js";
import type * as agentTasks from "../agentTasks.js";
import type * as agentToolMutations from "../agentToolMutations.js";
import type * as agentTools from "../agentTools.js";
import type * as aiChatActions from "../aiChatActions.js";
import type * as aiChats from "../aiChats.js";
import type * as archivedDates from "../archivedDates.js";
import type * as backlogLabel from "../backlogLabel.js";
import type * as crons from "../crons.js";
import type * as crons_cleanup from "../crons_cleanup.js";
import type * as dateLabels from "../dateLabels.js";
import type * as dates from "../dates.js";
import type * as folders from "../folders.js";
import type * as fullPageNotes from "../fullPageNotes.js";
import type * as http from "../http.js";
import type * as kanban from "../kanban.js";
import type * as lib_time from "../lib/time.js";
import type * as lib_typesafe from "../lib/typesafe.js";
import type * as lib_userData from "../lib/userData.js";
import type * as mcp from "../mcp.js";
import type * as mcpActivity from "../mcpActivity.js";
import type * as mcpEval from "../mcpEval.js";
import type * as mcpTools from "../mcpTools.js";
import type * as monthGroups from "../monthGroups.js";
import type * as notes from "../notes.js";
import type * as pomodoro from "../pomodoro.js";
import type * as rollover from "../rollover.js";
import type * as search from "../search.js";
import type * as stats from "../stats.js";
import type * as streaks from "../streaks.js";
import type * as todos from "../todos.js";
import type * as userApiKeys from "../userApiKeys.js";
import type * as users from "../users.js";
import type * as weeklyRecap from "../weeklyRecap.js";
import type * as weeklyRecapQueries from "../weeklyRecapQueries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentTaskActions: typeof agentTaskActions;
  agentTasks: typeof agentTasks;
  agentToolMutations: typeof agentToolMutations;
  agentTools: typeof agentTools;
  aiChatActions: typeof aiChatActions;
  aiChats: typeof aiChats;
  archivedDates: typeof archivedDates;
  backlogLabel: typeof backlogLabel;
  crons: typeof crons;
  crons_cleanup: typeof crons_cleanup;
  dateLabels: typeof dateLabels;
  dates: typeof dates;
  folders: typeof folders;
  fullPageNotes: typeof fullPageNotes;
  http: typeof http;
  kanban: typeof kanban;
  "lib/time": typeof lib_time;
  "lib/typesafe": typeof lib_typesafe;
  "lib/userData": typeof lib_userData;
  mcp: typeof mcp;
  mcpActivity: typeof mcpActivity;
  mcpEval: typeof mcpEval;
  mcpTools: typeof mcpTools;
  monthGroups: typeof monthGroups;
  notes: typeof notes;
  pomodoro: typeof pomodoro;
  rollover: typeof rollover;
  search: typeof search;
  stats: typeof stats;
  streaks: typeof streaks;
  todos: typeof todos;
  userApiKeys: typeof userApiKeys;
  users: typeof users;
  weeklyRecap: typeof weeklyRecap;
  weeklyRecapQueries: typeof weeklyRecapQueries;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  mcp: import("@convex-dev/mcp/_generated/component.js").ComponentApi<"mcp">;
};
