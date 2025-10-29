import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all full-page notes for a specific date
export const getFullPageNotesByDate = query({
  args: {
    date: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("fullPageNotes"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.string(),
      title: v.optional(v.string()),
      content: v.string(),
      order: v.number(),
      collapsed: v.optional(v.boolean()),
      pinnedToTop: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    const notes = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();
    
    // Sort by order field
    return notes.sort((a, b) => a.order - b.order);
  },
});

// Get a single full-page note by ID
export const getFullPageNote = query({
  args: {
    id: v.id("fullPageNotes"),
  },
  returns: v.union(
    v.object({
      _id: v.id("fullPageNotes"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.string(),
      title: v.optional(v.string()),
      content: v.string(),
      order: v.number(),
      collapsed: v.optional(v.boolean()),
      pinnedToTop: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = identity.subject;

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) {
      return null;
    }

    return note;
  },
});

// Create a new full-page note
export const createFullPageNote = mutation({
  args: {
    date: v.string(),
  },
  returns: v.id("fullPageNotes"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Get the highest order number for this date
    const existingNotes = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();

    const maxOrder =
      existingNotes.length > 0
        ? Math.max(...existingNotes.map((n) => n.order))
        : -1;

    return await ctx.db.insert("fullPageNotes", {
      userId: userId,
      date: args.date,
      title: "Untitled",
      content: "",
      order: maxOrder + 1,
      collapsed: false,
    });
  },
});

// Update a full-page note
export const updateFullPageNote = mutation({
  args: {
    id: v.id("fullPageNotes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    collapsed: v.optional(v.boolean()),
    pinnedToTop: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Build updates object only with provided fields
    const updates: Record<string, any> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.collapsed !== undefined) updates.collapsed = args.collapsed;
    if (args.pinnedToTop !== undefined) updates.pinnedToTop = args.pinnedToTop;

    // Patch directly without reading first to avoid write conflicts
    // ctx.db.patch will throw if the document doesn't exist
    await ctx.db.patch(args.id, updates);
    return null;
  },
});

// Delete a full-page note
export const deleteFullPageNote = mutation({
  args: {
    id: v.id("fullPageNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or unauthorized");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// Reorder full-page notes
export const reorderFullPageNotes = mutation({
  args: {
    date: v.string(),
    noteIds: v.array(v.id("fullPageNotes")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Patch all notes with new order in parallel to avoid sequential conflicts
    // ctx.db.patch will silently ignore notes that don't exist
    const updates = args.noteIds.map((noteId, index) =>
      ctx.db.patch(noteId, { order: index }),
    );

    await Promise.all(updates);
    return null;
  },
});

// Get counts of full-page notes grouped by date (for sidebar display)
export const getFullPageNoteCounts = query({
  args: {},
  returns: v.record(v.string(), v.number()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {};
    }
    const userId = identity.subject;

    const notes = await ctx.db
      .query("fullPageNotes")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    // Group notes by date and count them
    const counts: Record<string, number> = {};
    for (const note of notes) {
      counts[note.date] = (counts[note.date] || 0) + 1;
    }

    return counts;
  },
});

