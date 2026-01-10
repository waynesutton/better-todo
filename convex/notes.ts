import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all notes for a specific date (excludes folder notes)
export const getNotesByDate = query({
  args: {
    date: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("notes"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.optional(v.string()),
      folderId: v.optional(v.id("folders")),
      title: v.optional(v.string()),
      content: v.string(),
      order: v.optional(v.number()),
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
      .query("notes")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .collect();

    // Filter out notes that belong to folders (they should only appear in folder view)
    const dateNotes = notes.filter((note) => !note.folderId);

    // Sort by order, defaulting to 0 for legacy notes
    return dateNotes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
});

// Get all notes for a specific folder
export const getNotesByFolder = query({
  args: {
    folderId: v.id("folders"),
  },
  returns: v.array(
    v.object({
      _id: v.id("notes"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.optional(v.string()),
      folderId: v.optional(v.id("folders")),
      title: v.optional(v.string()),
      content: v.string(),
      order: v.optional(v.number()),
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
      .query("notes")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();

    // Sort by order, defaulting to 0 for legacy notes
    return notes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
});

// Create a new note (for a date OR a folder, not both)
export const createNote = mutation({
  args: {
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    title: v.string(),
  },
  returns: v.id("notes"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Use timestamp-based ordering instead of reading all notes
    // This avoids write conflicts when creating multiple notes rapidly
    const order = Date.now();

    return await ctx.db.insert("notes", {
      userId: userId,
      date: args.date,
      folderId: args.folderId,
      title: args.title,
      content: "",
      order: order,
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
    pinnedToTop: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const note = await ctx.db
      .query("notes")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.id))
      .unique();

    if (!note) {
      throw new Error("Note not found or unauthorized");
    }

    // Build updates object only with provided fields
    const updates: Record<string, any> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.collapsed !== undefined) updates.collapsed = args.collapsed;
    if (args.pinnedToTop !== undefined) updates.pinnedToTop = args.pinnedToTop;

    // Patch after verifying ownership
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Use indexed query to verify ownership without reading the document first
    const note = await ctx.db
      .query("notes")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("_id"), args.id)
        )
      )
      .unique();
    
    if (!note) {
      // Note doesn't exist or doesn't belong to user (idempotent)
      return null;
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// Reorder notes (supports both date-based and folder-based notes)
export const reorderNotes = mutation({
  args: {
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    noteIds: v.array(v.id("notes")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership of all notes before reordering
    let userNotes;
    if (args.folderId) {
      // Folder-based notes
      userNotes = await ctx.db
        .query("notes")
        .withIndex("by_user_and_folder", (q) =>
          q.eq("userId", userId).eq("folderId", args.folderId)
        )
        .collect();
    } else if (args.date) {
      // Date-based notes
      userNotes = await ctx.db
        .query("notes")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).eq("date", args.date)
        )
        .collect();
    } else {
      throw new Error("Either date or folderId must be provided");
    }

    const userNoteIds = new Set(userNotes.map((n) => n._id));

    // Only update notes that belong to the user
    const updates = args.noteIds
      .filter((noteId) => userNoteIds.has(noteId))
      .map((noteId, index) => ctx.db.patch(noteId, { order: index }));

    await Promise.all(updates);
    return null;
  },
});
