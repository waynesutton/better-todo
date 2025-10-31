import { query } from "./_generated/server";
import { v } from "convex/values";

// Search result type
const searchResultValidator = v.object({
  _id: v.union(v.id("todos"), v.id("notes"), v.id("fullPageNotes")),
  type: v.union(v.literal("todo"), v.literal("note"), v.literal("fullPageNote")),
  content: v.string(),
  title: v.optional(v.string()),
  date: v.optional(v.string()),
  completed: v.optional(v.boolean()),
  archived: v.optional(v.boolean()),
});

// Search across todos and notes
export const searchAll = query({
  args: {
    searchQuery: v.string(),
  },
  returns: v.array(searchResultValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    // Don't search if query is empty
    if (!args.searchQuery.trim()) {
      return [];
    }

    const results: Array<{
      _id: any;
      type: "todo" | "note" | "fullPageNote";
      content: string;
      title?: string;
      date?: string;
      completed?: boolean;
      archived?: boolean;
    }> = [];

    // Search todos
    const todos = await ctx.db
      .query("todos")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.searchQuery).eq("userId", userId),
      )
      .take(20);

    // Add todos to results
    for (const todo of todos) {
      results.push({
        _id: todo._id,
        type: "todo",
        content: todo.content,
        date: todo.date,
        completed: todo.completed,
        archived: todo.archived,
      });
    }

    // Search notes by content
    const notesByContent = await ctx.db
      .query("notes")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.searchQuery).eq("userId", userId),
      )
      .take(20);

    // Search notes by title
    const notesByTitle = await ctx.db
      .query("notes")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchQuery).eq("userId", userId),
      )
      .take(20);

    // Combine notes, avoiding duplicates
    const noteIds = new Set<string>();
    const allNotes = [...notesByTitle, ...notesByContent];

    for (const note of allNotes) {
      if (!noteIds.has(note._id)) {
        noteIds.add(note._id);
        results.push({
          _id: note._id,
          type: "note",
          content: note.content,
          title: note.title,
          date: note.date,
        });
      }
    }

    // Search full-page notes by content
    const fullPageNotesByContent = await ctx.db
      .query("fullPageNotes")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.searchQuery).eq("userId", userId),
      )
      .take(20);

    // Search full-page notes by title
    const fullPageNotesByTitle = await ctx.db
      .query("fullPageNotes")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchQuery).eq("userId", userId),
      )
      .take(20);

    // Combine full-page notes, avoiding duplicates
    const fullPageNoteIds = new Set<string>();
    const allFullPageNotes = [...fullPageNotesByTitle, ...fullPageNotesByContent];

    for (const note of allFullPageNotes) {
      if (!fullPageNoteIds.has(note._id)) {
        fullPageNoteIds.add(note._id);
        results.push({
          _id: note._id,
          type: "fullPageNote",
          content: note.content,
          title: note.title,
          date: note.date,
        });
      }
    }

    // Return top 30 results
    return results.slice(0, 30);
  },
});
