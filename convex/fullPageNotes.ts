import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get full-page notes by their IDs (for tabs)
export const getFullPageNotesByIds = query({
  args: {
    noteIds: v.array(v.id("fullPageNotes")),
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
      )),
      order: v.number(),
      collapsed: v.optional(v.boolean()),
      pinnedToTop: v.optional(v.boolean()),
      archived: v.optional(v.boolean()),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    // Fetch notes by IDs and filter by userId
    const notes = await Promise.all(
      args.noteIds.map(async (noteId) => {
        const note = await ctx.db.get(noteId);
        if (note && note.userId === userId) {
          return note;
        }
        return null;
      }),
    );

    // Filter out nulls and sort by order
    return notes
      .filter((note): note is NonNullable<typeof note> => note !== null)
      .sort((a, b) => a.order - b.order);
  },
});

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
      )),
      order: v.number(),
      collapsed: v.optional(v.boolean()),
      pinnedToTop: v.optional(v.boolean()),
      archived: v.optional(v.boolean()),
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
    
    // Filter out archived notes and sort by order field
    return notes
      .filter((note) => !note.archived)
      .sort((a, b) => a.order - b.order);
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
      )),
      order: v.number(),
      collapsed: v.optional(v.boolean()),
      pinnedToTop: v.optional(v.boolean()),
      archived: v.optional(v.boolean()),
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
    includeArchived: v.optional(v.boolean()),
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
      )),
      order: v.number(),
      collapsed: v.optional(v.boolean()),
      pinnedToTop: v.optional(v.boolean()),
      archived: v.optional(v.boolean()),
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
    
    // Filter out archived notes unless includeArchived is true
    const filteredNotes = args.includeArchived
      ? notes
      : notes.filter((note) => !note.archived);
    
    // Sort by order field
    return filteredNotes.sort((a, b) => a.order - b.order);
  },
});

// Create a new full-page note
export const createFullPageNote = mutation({
  args: {
    date: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
  },
  returns: v.id("fullPageNotes"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Validate that either date or folderId is provided, but not both
    if (!args.date && !args.folderId) {
      throw new Error("Either date or folderId must be provided");
    }
    if (args.date && args.folderId) {
      throw new Error("Cannot provide both date and folderId");
    }

    let maxOrder = -1;

    if (args.folderId) {
      // Get the highest order number for this folder
      const existingNotes = await ctx.db
        .query("fullPageNotes")
        .withIndex("by_user_and_folder", (q) =>
          q.eq("userId", userId).eq("folderId", args.folderId),
        )
        .collect();

      maxOrder =
        existingNotes.length > 0
          ? Math.max(...existingNotes.map((n) => n.order))
          : -1;
    } else if (args.date) {
      // Get the highest order number for this date
      const existingNotes = await ctx.db
        .query("fullPageNotes")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).eq("date", args.date),
        )
        .collect();

      maxOrder =
        existingNotes.length > 0
          ? Math.max(...existingNotes.map((n) => n.order))
          : -1;
    }

    const noteId = await ctx.db.insert("fullPageNotes", {
      userId: userId,
      date: args.date,
      folderId: args.folderId,
      title: "Untitled",
      content: "",
      order: maxOrder + 1,
      collapsed: false,
      archived: false,
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
    )),
    collapsed: v.optional(v.boolean()),
    pinnedToTop: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Build updates object only with provided fields
    const updates: Record<string, any> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.format !== undefined) updates.format = args.format;
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

    // Group notes by date and count them (only count notes with dates, exclude archived)
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.date && !note.archived) {
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

    // Group notes by folder and count them (only count notes with folders, exclude archived)
    const counts: Record<string, number> = {};
    for (const note of notes) {
      if (note.folderId && !note.archived) {
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

// Generate upload URL for image uploads
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    // Generate and return the upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

// Get storage URL for an uploaded file
export const getStorageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // Get the URL for the storage ID
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Helper mutation to get storage URL after upload (for use in actions/mutations)
export const getImageUrl = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // Get the URL for the storage ID
    return await ctx.storage.getUrl(args.storageId);
  },
});

