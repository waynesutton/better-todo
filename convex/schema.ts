import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table stores authenticated users from WorkOS
  users: defineTable({
    userId: v.string(), // WorkOS user ID (from auth subject)
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  }).index("by_userId", ["userId"]),

  // Todos table stores all todo items with markdown support
  todos: defineTable({
    userId: v.string(), // From WorkOS auth
    date: v.string(), // Format: YYYY-MM-DD
    content: v.string(), // Markdown content
    type: v.union(
      v.literal("todo"),
      v.literal("h1"),
      v.literal("h2"),
      v.literal("h3"),
    ),
    completed: v.boolean(),
    archived: v.boolean(),
    order: v.number(), // For drag-drop positioning
    parentId: v.optional(v.id("todos")), // For nested items under collapsible headers
    collapsed: v.boolean(), // For header sections
    pinned: v.optional(v.boolean()), // For pinned todos
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user", ["userId"])
    .index("by_user_and_pinned", ["userId", "pinned"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    }),

  // Notes table stores multiple notes per date
  notes: defineTable({
    userId: v.string(),
    date: v.string(), // Format: YYYY-MM-DD
    title: v.optional(v.string()), // Note title (optional for backward compatibility)
    content: v.string(), // Markdown content
    order: v.optional(v.number()), // Order for drag-and-drop
    collapsed: v.optional(v.boolean()), // Whether note is collapsed
    pinnedToTop: v.optional(v.boolean()), // Whether note is pinned to top of page
  })
    .index("by_user_and_date", ["userId", "date"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  // Archived dates
  archivedDates: defineTable({
    userId: v.string(),
    date: v.string(), // Format: YYYY-MM-DD
  }).index("by_user_and_date", ["userId", "date"]),

  // Custom date labels - allows renaming dates with custom text
  dateLabels: defineTable({
    userId: v.string(),
    date: v.string(), // Format: YYYY-MM-DD
    label: v.string(), // Custom text label for the date
  }).index("by_user_and_date", ["userId", "date"]),

  // Custom folders for organizing dates
  folders: defineTable({
    userId: v.string(),
    name: v.string(),
    order: v.number(),
    archived: v.boolean(),
  }).index("by_user", ["userId"]),

  // Association between folders and dates
  folderDates: defineTable({
    userId: v.string(),
    folderId: v.id("folders"),
    date: v.string(), // Format: YYYY-MM-DD
  })
    .index("by_user_and_folder", ["userId", "folderId"])
    .index("by_user_and_date", ["userId", "date"]),

  // Month groups for auto-grouping completed months
  monthGroups: defineTable({
    userId: v.string(),
    monthName: v.string(), // e.g., "January 2025"
    year: v.number(),
    month: v.number(), // 1-12
    archived: v.boolean(),
  }).index("by_user", ["userId"]),

  // Association between month groups and dates
  monthGroupDates: defineTable({
    userId: v.string(),
    monthGroupId: v.id("monthGroups"),
    date: v.string(), // Format: YYYY-MM-DD
  })
    .index("by_user_and_month_group", ["userId", "monthGroupId"])
    .index("by_user_and_date", ["userId", "date"]),

  // Pomodoro timer sessions
  pomodoroSessions: defineTable({
    userId: v.optional(v.string()), // Optional for guest users
    startTime: v.number(), // Timestamp when timer started
    duration: v.number(), // Timer duration in milliseconds (default 1500000 for 25 min)
    remainingTime: v.number(), // Milliseconds remaining
    status: v.union(
      v.literal("idle"),
      v.literal("running"),
      v.literal("paused"),
      v.literal("completed"),
    ),
    lastUpdated: v.number(), // Last update timestamp
  }).index("by_user", ["userId"]),
});
