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
    backlog: v.optional(v.boolean()), // For backlog todos
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user", ["userId"])
    .index("by_user_and_pinned", ["userId", "pinned"])
    .index("by_user_and_backlog", ["userId", "backlog"])
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
    backgroundImageUrl: v.optional(v.string()), // Unsplash image URL for full-screen background
  }).index("by_user", ["userId"]),

  // Custom backlog label - allows renaming the backlog section
  backlogLabel: defineTable({
    userId: v.string(),
    label: v.string(), // Custom text label for backlog section (default: "Backlog")
  }).index("by_user", ["userId"]),

  // User preferences - stores per-user settings
  userPreferences: defineTable({
    userId: v.string(),
    todoFontSize: v.number(), // Font size in pixels for .todo-text (default: 12)
  }).index("by_user", ["userId"]),

  // Full page notes - stores full-page notes with Chrome-style tabs
  fullPageNotes: defineTable({
    userId: v.string(),
    date: v.optional(v.string()), // Format: YYYY-MM-DD (optional when note is in a folder)
    folderId: v.optional(v.id("folders")), // Optional folder association
    title: v.optional(v.string()), // Note title (defaults to "Untitled")
    content: v.string(), // Note content with markdown/code block support
    format: v.optional(v.union(
      v.literal("plaintext"),
      v.literal("markdown"),
      v.literal("css"),
      v.literal("javascript"),
      v.literal("typescript"),
      v.literal("html"),
      v.literal("json"),
      v.literal("python"),
      v.literal("go"),
      v.literal("rust"),
    )), // Format type for syntax highlighting and code wrapping
    order: v.number(), // Order for sorting tabs left-to-right
    collapsed: v.optional(v.boolean()), // For future collapsible functionality
    pinnedToTop: v.optional(v.boolean()), // For future pin functionality
  })
    .index("by_user_and_date", ["userId", "date"])
    .index("by_user_and_folder", ["userId", "folderId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),

  // Global statistics - tracks cumulative counts across the application
  statistics: defineTable({
    key: v.string(), // Unique key for the statistic (e.g., "fullPageNotesCreated")
    value: v.number(), // The cumulative count
  }).index("by_key", ["key"]),
});
