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
      date: v.optional(v.string()),
      folderId: v.optional(v.id("folders")),
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
      date: v.optional(v.string()),
      folderId: v.optional(v.id("folders")),
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

// Get all full-page notes for a specific folder
export const getFullPageNotesByFolder = query({
  args: {
    folderId: v.id("folders"),
  },
  returns: v.array(
    v.object({
      _id: v.id("fullPageNotes"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.optional(v.string()),
      folderId: v.optional(v.id("folders")),
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
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();
    
    // Sort by order field
    return notes.sort((a, b) => a.order - b.order);
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

    const noteId = await ctx.db.insert("fullPageNotes", {
      userId: userId,
      date: args.date,
      title: "Untitled",
      content: "",
      order: maxOrder + 1,
      collapsed: false,
    });

    // Increment global statistics counter for full-page notes created
    const stat = await ctx.db
      .query("statistics")
      .withIndex("by_key", (q) => q.eq("key", "fullPageNotesCreated"))
      .unique();

    if (stat) {
      await ctx.db.patch(stat._id, { value: stat.value + 1 });
    } else {
      // First time creating a full-page note, initialize the counter
      await ctx.db.insert("statistics", {
        key: "fullPageNotesCreated",
        value: 1,
      });
    }

    return noteId;
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

    // Group notes by date and count them (only count notes with dates)
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.date) {
        counts[note.date] = (counts[note.date] || 0) + 1;
      }
    }

    return counts;
  },
});

// Get counts of full-page notes grouped by folder (for sidebar display)
export const getFullPageNoteCountsByFolder = query({
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

    // Group notes by folder and count them (only count notes with folders)
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.folderId) {
        // Convert ID to string for consistent key access
        const folderIdStr = note.folderId.toString();
        counts[folderIdStr] = (counts[folderIdStr] || 0) + 1;
      }
    }

    return counts;
  },
});

// Move a full-page note to a folder
export const moveFullPageNoteToFolder = mutation({
  args: {
    noteId: v.id("fullPageNotes"),
    folderId: v.id("folders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or unauthorized");
    }

    // Get the highest order number for this folder
    const existingNotes = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();

    const maxOrder =
      existingNotes.length > 0
        ? Math.max(...existingNotes.map((n) => n.order))
        : -1;

    // Move note to folder (remove date association, set proper order)
    await ctx.db.patch(args.noteId, {
      folderId: args.folderId,
      date: undefined,
      order: maxOrder + 1,
    });

    return null;
  },
});

// Move a full-page note to a date
export const moveFullPageNoteToDate = mutation({
  args: {
    noteId: v.id("fullPageNotes"),
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found or unauthorized");
    }

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

    // Move note to date (remove folder association)
    await ctx.db.patch(args.noteId, {
      date: args.date,
      folderId: undefined,
      order: maxOrder + 1,
    });

    return null;
  },
});

