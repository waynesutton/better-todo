import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserId } from "./users";

// Get all folders for the current user with their dates
export const getFolders = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("folders"),
      _creationTime: v.number(),
      userId: v.string(),
      name: v.string(),
      order: v.number(),
      archived: v.boolean(),
      dates: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Fetch dates for each folder
    const foldersWithDates = await Promise.all(
      folders.map(async (folder) => {
        const folderDates = await ctx.db
          .query("folderDates")
          .withIndex("by_user_and_folder", (q) =>
            q.eq("userId", userId).eq("folderId", folder._id),
          )
          .collect();

        const dates = folderDates
          .map((fd) => fd.date)
          .sort()
          .reverse();

        return {
          ...folder,
          dates,
        };
      }),
    );

    return foldersWithDates.sort((a, b) => a.order - b.order);
  },
});

// Get dates for a specific folder
export const getFolderDates = query({
  args: { folderId: v.id("folders") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const folderDates = await ctx.db
      .query("folderDates")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();

    return folderDates
      .map((fd) => fd.date)
      .sort()
      .reverse();
  },
});

// Get folder for a specific date
export const getFolderForDate = query({
  args: { date: v.string() },
  returns: v.union(v.id("folders"), v.null()),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const folderDate = await ctx.db
      .query("folderDates")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    return folderDate?.folderId ?? null;
  },
});

// Create a new folder
export const createFolder = mutation({
  args: { name: v.string() },
  returns: v.id("folders"),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Use timestamp-based ordering instead of reading all folders
    // This avoids write conflicts when creating multiple folders rapidly
    const order = Date.now();

    const folderId = await ctx.db.insert("folders", {
      userId,
      name: args.name,
      order: order,
      archived: false,
    });

    return folderId;
  },
});

// Rename a folder
export const renameFolder = mutation({
  args: { folderId: v.id("folders"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Use indexed query to verify ownership
    const folder = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.folderId))
      .unique();

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Only update if name is different (idempotent)
    if (folder.name === args.name) {
      return null;
    }

    await ctx.db.patch(args.folderId, { name: args.name });
    return null;
  },
});

// Archive a folder
export const archiveFolder = mutation({
  args: { folderId: v.id("folders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Use indexed query to verify ownership and check current state
    const folder = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.folderId))
      .unique();

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Only update if not already archived (idempotent)
    if (folder.archived) {
      return null;
    }

    // Archive the folder
    await ctx.db.patch(args.folderId, { archived: true });

    // Archive all full-page notes in this folder
    const folderNotes = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();

    // Archive all notes in parallel
    await Promise.all(
      folderNotes.map((note) =>
        ctx.db.patch(note._id, { archived: true }),
      ),
    );

    return null;
  },
});

// Unarchive a folder
export const unarchiveFolder = mutation({
  args: { folderId: v.id("folders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Use indexed query to verify ownership and check current state
    const folder = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.folderId))
      .unique();

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Only update if currently archived (idempotent)
    if (!folder.archived) {
      return null;
    }

    // Unarchive the folder
    await ctx.db.patch(args.folderId, { archived: false });

    // Unarchive all full-page notes in this folder
    const folderNotes = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();

    // Unarchive all notes in parallel
    await Promise.all(
      folderNotes.map((note) =>
        ctx.db.patch(note._id, { archived: false }),
      ),
    );

    return null;
  },
});

// Delete a folder and all its associations
export const deleteFolder = mutation({
  args: { folderId: v.id("folders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Use indexed query to verify ownership
    const folder = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.folderId))
      .unique();

    if (!folder) {
      // Folder doesn't exist or doesn't belong to user (idempotent)
      return null;
    }

    // Delete all folder-date associations
    const folderDates = await ctx.db
      .query("folderDates")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();

    // Delete all full-page notes in this folder
    const folderNotes = await ctx.db
      .query("fullPageNotes")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();

    // Delete all in parallel
    await Promise.all([
      ...folderDates.map((fd) => ctx.db.delete(fd._id)),
      ...folderNotes.map((note) => ctx.db.delete(note._id)),
      ctx.db.delete(args.folderId),
    ]);

    return null;
  },
});

// Add a date to a folder
export const addDateToFolder = mutation({
  args: { folderId: v.id("folders"), date: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Use indexed query to verify folder ownership
    const folder = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.folderId))
      .unique();

    if (!folder) {
      throw new Error("Folder not found");
    }

    // Check if date is already in this folder
    const existing = await ctx.db
      .query("folderDates")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    if (existing) {
      // Only update if folder is different (idempotent)
      if (existing.folderId === args.folderId) {
        return null;
      }
      await ctx.db.patch(existing._id, { folderId: args.folderId });
    } else {
      // Create new association
      await ctx.db.insert("folderDates", {
        userId,
        folderId: args.folderId,
        date: args.date,
      });
    }

    return null;
  },
});

// Remove a date from a folder
export const removeDateFromFolder = mutation({
  args: { date: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const folderDate = await ctx.db
      .query("folderDates")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    if (folderDate) {
      await ctx.db.delete(folderDate._id);
    }

    return null;
  },
});
