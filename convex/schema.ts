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
});
