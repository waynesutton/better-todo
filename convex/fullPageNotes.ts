import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
      imageIds: v.optional(v.array(v.id("_storage"))),
      backgroundImageUrl: v.optional(v.string()),
      shareSlug: v.optional(v.string()),
      isShared: v.optional(v.boolean()),
      hideHeaderOnShare: v.optional(v.boolean()),
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
      imageIds: v.optional(v.array(v.id("_storage"))),
      backgroundImageUrl: v.optional(v.string()),
      shareSlug: v.optional(v.string()),
      isShared: v.optional(v.boolean()),
      hideHeaderOnShare: v.optional(v.boolean()),
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
      imageIds: v.optional(v.array(v.id("_storage"))),
      backgroundImageUrl: v.optional(v.string()),
      shareSlug: v.optional(v.string()),
      isShared: v.optional(v.boolean()),
      hideHeaderOnShare: v.optional(v.boolean()),
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
      imageIds: v.optional(v.array(v.id("_storage"))),
      backgroundImageUrl: v.optional(v.string()),
      shareSlug: v.optional(v.string()),
      isShared: v.optional(v.boolean()),
      hideHeaderOnShare: v.optional(v.boolean()),
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

    // Use timestamp-based ordering instead of reading all notes
    // This avoids write conflicts when creating multiple notes rapidly
    const order = Date.now();

    const noteId = await ctx.db.insert("fullPageNotes", {
      userId: userId,
      date: args.date,
      folderId: args.folderId,
      title: "Untitled",
      content: "",
      order: order,
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

    // Use indexed query to verify ownership without reading the document first
    const note = await ctx.db
      .query("fullPageNotes")
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

    // Use indexed query to verify note ownership
    const note = await ctx.db
      .query("fullPageNotes")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("_id"), args.noteId)
        )
      )
      .unique();

    if (!note) {
      throw new Error("Note not found or unauthorized");
    }

    // Only update if folder is different (idempotent)
    if (note.folderId === args.folderId) {
      return null;
    }

    // Use timestamp-based ordering to avoid reading all notes
    const order = Date.now();

    // Move note to folder (remove date association, set proper order)
    await ctx.db.patch(args.noteId, {
      folderId: args.folderId,
      date: undefined,
      order: order,
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

    // Use indexed query to verify note ownership
    const note = await ctx.db
      .query("fullPageNotes")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("_id"), args.noteId)
        )
      )
      .unique();

    if (!note) {
      throw new Error("Note not found or unauthorized");
    }

    // Only update if date is different (idempotent)
    if (note.date === args.date && !note.folderId) {
      return null;
    }

    // Use timestamp-based ordering to avoid reading all notes
    const order = Date.now();

    // Move note to date (remove folder association)
    await ctx.db.patch(args.noteId, {
      date: args.date,
      folderId: undefined,
      order: order,
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

// Add image to full-page note
export const addImageToNote = mutation({
  args: {
    noteId: v.id("fullPageNotes"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Use indexed query to verify note ownership
    const note = await ctx.db
      .query("fullPageNotes")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("_id"), args.noteId)
        )
      )
      .unique();

    if (!note) {
      throw new Error("Note not found or unauthorized");
    }

    // Append image to imageIds array (or create array if doesn't exist)
    const currentImageIds = note.imageIds || [];
    const updatedImageIds = [...currentImageIds, args.storageId];

    await ctx.db.patch(args.noteId, {
      imageIds: updatedImageIds,
    });

    return null;
  },
});

// Remove image from full-page note and delete from storage
export const removeImageFromNote = mutation({
  args: {
    noteId: v.id("fullPageNotes"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Use indexed query to verify note ownership
    const note = await ctx.db
      .query("fullPageNotes")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("_id"), args.noteId)
        )
      )
      .unique();

    if (!note) {
      // Idempotent - note doesn't exist or doesn't belong to user
      return null;
    }

    // Remove image from imageIds array
    const currentImageIds = note.imageIds || [];
    const updatedImageIds = currentImageIds.filter(id => id !== args.storageId);

    // Only update if image was in the array
    if (currentImageIds.length === updatedImageIds.length) {
      // Image wasn't in array (idempotent)
      return null;
    }

    await ctx.db.patch(args.noteId, {
      imageIds: updatedImageIds,
    });

    // Delete file from Convex storage
    try {
      await ctx.storage.delete(args.storageId);
    } catch (error) {
      // Silently handle if file already deleted (idempotent)
      console.log("Storage delete error (may already be deleted):", error);
    }

    return null;
  },
});

// Get image URLs for a full-page note
export const getImageUrls = query({
  args: {
    noteId: v.id("fullPageNotes"),
  },
  returns: v.array(
    v.object({
      storageId: v.id("_storage"),
      url: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const userId = identity.subject;

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      return [];
    }

    const imageIds = note.imageIds || [];
    
    // Fetch all image URLs in parallel
    const imageUrlPromises = imageIds.map(async (storageId) => {
      const url = await ctx.storage.getUrl(storageId);
      return url ? { storageId, url } : null;
    });

    const imageUrlsWithNulls = await Promise.all(imageUrlPromises);
    
    // Filter out null values (images that no longer exist)
    const imageUrls: Array<{ storageId: Id<"_storage">; url: string }> = [];
    for (const img of imageUrlsWithNulls) {
      if (img !== null) {
        imageUrls.push(img);
      }
    }
    
    return imageUrls;
  },
});

// Reserved slug words that cannot be used
const RESERVED_SLUGS = [
  "share", "api", "admin", "launch", "about", "stats", 
  "changelog", "login", "logout", "settings", "profile"
];

// Validate slug format (alphanumeric, hyphens, underscores, 3-50 chars)
function validateSlugFormat(slug: string): boolean {
  const slugRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  return slugRegex.test(slug) && !RESERVED_SLUGS.includes(slug.toLowerCase());
}

// Generate a random slug
function generateRandomSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// Check if a slug is available (public query, no auth required)
export const checkSlugAvailability = query({
  args: {
    slug: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Case-insensitive lookup
    const slugLower = args.slug.toLowerCase();
    
    // Check if slug is reserved
    if (RESERVED_SLUGS.includes(slugLower)) {
      return false;
    }
    
    // Check if slug format is valid
    if (!validateSlugFormat(args.slug)) {
      return false;
    }
    
    // Check if slug already exists (case-insensitive)
    const existing = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", args.slug))
      .first();
    
    return existing === null;
  },
});

// Get note by slug with image URLs (public query, no auth required)
export const getNoteBySlug = query({
  args: {
    slug: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("fullPageNotes"),
      _creationTime: v.number(),
      userId: v.string(),
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
      shareSlug: v.optional(v.string()),
      isShared: v.optional(v.boolean()),
      imageIds: v.optional(v.array(v.id("_storage"))),
      backgroundImageUrl: v.optional(v.string()),
      hideHeaderOnShare: v.optional(v.boolean()),
      imageUrls: v.array(v.object({
        storageId: v.id("_storage"),
        url: v.string(),
      })),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    // Look up note by shareSlug using indexed query
    const note = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", args.slug))
      .first();
    
    // Return null if note doesn't exist or isn't shared
    if (!note || !note.isShared) {
      return null;
    }
    
    // Load all image URLs in parallel if images exist
    const imageIds = note.imageIds || [];
    const imageUrlPromises = imageIds.map(async (storageId) => {
      const url = await ctx.storage.getUrl(storageId);
      return url ? { storageId, url } : null;
    });
    
    const imageUrlsWithNulls = await Promise.all(imageUrlPromises);
    const imageUrls: Array<{ storageId: Id<"_storage">; url: string }> = [];
    for (const img of imageUrlsWithNulls) {
      if (img !== null) {
        imageUrls.push(img);
      }
    }
    
    return {
      _id: note._id,
      _creationTime: note._creationTime,
      userId: note.userId,
      title: note.title,
      content: note.content,
      format: note.format,
      shareSlug: note.shareSlug,
      isShared: note.isShared,
      imageIds: note.imageIds,
      backgroundImageUrl: note.backgroundImageUrl,
      hideHeaderOnShare: note.hideHeaderOnShare,
      imageUrls,
    };
  },
});

// Get note metadata for Open Graph (internal query for HTTP action)
export const getSharedNoteMetadata = internalQuery({
  args: {
    slug: v.string(),
  },
  returns: v.union(
    v.object({
      title: v.string(),
      content: v.string(),
      screenshotUrl: v.union(v.string(), v.null()),
      slug: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    // Look up note by shareSlug
    const note = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", args.slug))
      .first();
    
    // Return null if note doesn't exist or isn't shared
    if (!note || !note.isShared) {
      return null;
    }
    
    // Get first image URL if available
    let screenshotUrl: string | null = null;
    if (note.imageIds && note.imageIds.length > 0) {
      screenshotUrl = await ctx.storage.getUrl(note.imageIds[0]);
    }
    
    return {
      title: note.title || "Untitled",
      content: note.content,
      screenshotUrl,
      slug: args.slug,
    };
  },
});

// Generate or update share link for a note
export const generateShareLink = mutation({
  args: {
    noteId: v.id("fullPageNotes"),
    customSlug: v.optional(v.string()),
    hideHeaderOnShare: v.optional(v.boolean()),
  },
  returns: v.object({
    shareUrl: v.string(),
    slug: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;
    
    // Verify note ownership
    const note = await ctx.db
      .query("fullPageNotes")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("_id"), args.noteId)
        )
      )
      .unique();
    
    if (!note) {
      throw new Error("Note not found or unauthorized");
    }
    
    let slug: string;
    
    if (args.customSlug) {
      // Validate custom slug format
      if (!validateSlugFormat(args.customSlug)) {
        throw new Error("Invalid slug format. Use 3-50 characters (letters, numbers, hyphens, underscores)");
      }
      
      // Check if slug is available (case-insensitive)
      const slugLower = args.customSlug.toLowerCase();
      if (RESERVED_SLUGS.includes(slugLower)) {
        throw new Error("This slug is reserved and cannot be used");
      }
      
      // Check if slug is already taken by another note
      const existing = await ctx.db
        .query("fullPageNotes")
        .withIndex("by_shareSlug", (q) => q.eq("shareSlug", args.customSlug))
        .first();
      
      if (existing && existing._id !== args.noteId) {
        throw new Error("This slug is already taken");
      }
      
      slug = args.customSlug;
    } else {
      // Generate random slug and ensure uniqueness
      let attempts = 0;
      do {
        slug = generateRandomSlug();
        const existing = await ctx.db
          .query("fullPageNotes")
          .withIndex("by_shareSlug", (q) => q.eq("shareSlug", slug))
          .first();
        if (!existing) break;
        attempts++;
      } while (attempts < 10);
      
      if (attempts >= 10) {
        throw new Error("Failed to generate unique slug");
      }
    }
    
    // Early return if slug is already set (idempotent)
    if (note.shareSlug === slug && note.isShared && note.hideHeaderOnShare === args.hideHeaderOnShare) {
      const baseUrl = process.env.CONVEX_SITE_URL || "https://bettertodo.app";
      const shareUrl = `${baseUrl}/share/${slug}`;
      return { shareUrl, slug };
    }
    
    // Patch directly without re-reading
    await ctx.db.patch(args.noteId, {
      shareSlug: slug,
      isShared: true,
      hideHeaderOnShare: args.hideHeaderOnShare,
    });
    
    // Construct share URL (use environment variable or default)
    const baseUrl = process.env.CONVEX_SITE_URL || "https://bettertodo.app";
    const shareUrl = `${baseUrl}/share/${slug}`;
    
    return { shareUrl, slug };
  },
});

// Revoke share link for a note
export const revokeShareLink = mutation({
  args: {
    noteId: v.id("fullPageNotes"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;
    
    // Verify note ownership
    const note = await ctx.db
      .query("fullPageNotes")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("_id"), args.noteId)
        )
      )
      .unique();
    
    if (!note) {
      // Note doesn't exist or doesn't belong to user (idempotent)
      return null;
    }
    
    // Only update if note is currently shared (idempotent)
    if (!note.isShared) {
      return null;
    }
    
    // Patch directly to remove share settings
    await ctx.db.patch(args.noteId, {
      shareSlug: undefined,
      isShared: false,
    });
    
    return null;
  },
});

// Update hide header setting for shared note
export const updateHideHeader = mutation({
  args: {
    noteId: v.id("fullPageNotes"),
    hideHeaderOnShare: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;
    
    // Verify note ownership
    const note = await ctx.db
      .query("fullPageNotes")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("_id"), args.noteId)
        )
      )
      .unique();
    
    if (!note) {
      throw new Error("Note not found or unauthorized");
    }
    
    // Early return if already set to desired value (idempotent)
    if (note.hideHeaderOnShare === args.hideHeaderOnShare) {
      return null;
    }
    
    // Patch directly without re-reading
    await ctx.db.patch(args.noteId, {
      hideHeaderOnShare: args.hideHeaderOnShare,
    });
    
    return null;
  },
});

// Update share slug for a note
export const updateShareSlug = mutation({
  args: {
    noteId: v.id("fullPageNotes"),
    newSlug: v.string(),
  },
  returns: v.object({
    shareUrl: v.string(),
    slug: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;
    
    // Verify note ownership
    const note = await ctx.db
      .query("fullPageNotes")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("_id"), args.noteId)
        )
      )
      .unique();
    
    if (!note) {
      throw new Error("Note not found or unauthorized");
    }
    
    // Validate new slug format
    if (!validateSlugFormat(args.newSlug)) {
      throw new Error("Invalid slug format. Use 3-50 characters (letters, numbers, hyphens, underscores)");
    }
    
    // Check if slug is reserved
    const slugLower = args.newSlug.toLowerCase();
    if (RESERVED_SLUGS.includes(slugLower)) {
      throw new Error("This slug is reserved and cannot be used");
    }
    
    // Check if new slug is same as current (idempotent)
    if (note.shareSlug === args.newSlug) {
      const baseUrl = process.env.CONVEX_SITE_URL || "https://bettertodo.app";
      const shareUrl = `${baseUrl}/share/${args.newSlug}`;
      return { shareUrl, slug: args.newSlug };
    }
    
    // Check if new slug is already taken by another note
    const existing = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", args.newSlug))
      .first();
    
    if (existing && existing._id !== args.noteId) {
      throw new Error("This slug is already taken");
    }
    
    // Update slug and ensure isShared is true
    await ctx.db.patch(args.noteId, {
      shareSlug: args.newSlug,
      isShared: true,
    });
    
    // Construct share URL
    const baseUrl = process.env.CONVEX_SITE_URL || "https://bettertodo.app";
    const shareUrl = `${baseUrl}/share/${args.newSlug}`;
    
    return { shareUrl, slug: args.newSlug };
  },
});

