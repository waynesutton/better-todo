/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as archivedDates from "../archivedDates.js";
import type * as dateLabels from "../dateLabels.js";
import type * as dates from "../dates.js";
import type * as folders from "../folders.js";
import type * as http from "../http.js";
import type * as monthGroups from "../monthGroups.js";
import type * as notes from "../notes.js";
import type * as search from "../search.js";
import type * as todos from "../todos.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  archivedDates: typeof archivedDates;
  dateLabels: typeof dateLabels;
  dates: typeof dates;
  folders: typeof folders;
  http: typeof http;
  monthGroups: typeof monthGroups;
  notes: typeof notes;
  search: typeof search;
  todos: typeof todos;
  users: typeof users;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
