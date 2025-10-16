import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get all notes for a specific date
export const getNotesByDate = query({
  args: {
    date: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("notes"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.string(),
      title: v.optional(v.string()),
      content: v.string(),
      order: v.optional(v.number()),
      collapsed: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = "anonymous";

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();

    // Sort by order, defaulting to 0 for legacy notes
    return notes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
});

// Create a new note
export const createNote = mutation({
  args: {
    date: v.string(),
    title: v.string(),
  },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const userId = "anonymous";

    // Get the highest order number
    const existingNotes = await ctx.db
      .query("notes")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();

    const maxOrder =
      existingNotes.length > 0
        ? Math.max(...existingNotes.map((n) => n.order ?? 0))
        : -1;

    return await ctx.db.insert("notes", {
      userId: userId,
      date: args.date,
      title: args.title,
      content: "",
      order: maxOrder + 1,
      collapsed: false,
    });
  },
});

// Update a note
export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    collapsed: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = "anonymous";

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or unauthorized");
    }

    const updates: Record<string, any> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.collapsed !== undefined) updates.collapsed = args.collapsed;

    await ctx.db.patch(args.id, updates);
    return null;
  },
});

// Delete a note
export const deleteNote = mutation({
  args: {
    id: v.id("notes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = "anonymous";

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or unauthorized");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// Reorder notes
export const reorderNotes = mutation({
  args: {
    date: v.string(),
    noteIds: v.array(v.id("notes")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = "anonymous";

    for (let i = 0; i < args.noteIds.length; i++) {
      const note = await ctx.db.get(args.noteIds[i]);
      if (note && note.userId === userId && note.date === args.date) {
        await ctx.db.patch(args.noteIds[i], { order: i });
      }
    }

    return null;
  },
});
