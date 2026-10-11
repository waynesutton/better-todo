import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  createNoteForUser,
  getOwnedNote,
  updateNoteForUser,
} from "./lib/userData";

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
    return await createNoteForUser(ctx, identity.subject, args);
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

    const note = await getOwnedNote(ctx, userId, args.id);
    if (!note) {
      throw new Error("Note not found or unauthorized");
    }

    await updateNoteForUser(ctx, args.id, {
      title: args.title,
      content: args.content,
      collapsed: args.collapsed,
      pinnedToTop: args.pinnedToTop,
    });
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

    const note = await getOwnedNote(ctx, userId, args.id);
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
