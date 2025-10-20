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

    // Get the highest order number
    const folders = await ctx.db
      .query("folders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const maxOrder = folders.reduce((max, f) => Math.max(max, f.order), -1);

    const folderId = await ctx.db.insert("folders", {
      userId,
      name: args.name,
      order: maxOrder + 1,
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

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
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

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }

    await ctx.db.patch(args.folderId, { archived: true });
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

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }

    await ctx.db.patch(args.folderId, { archived: false });
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

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }

    // Delete all folder-date associations
    const folderDates = await ctx.db
      .query("folderDates")
      .withIndex("by_user_and_folder", (q) =>
        q.eq("userId", userId).eq("folderId", args.folderId),
      )
      .collect();

    for (const fd of folderDates) {
      await ctx.db.delete(fd._id);
    }

    // Delete the folder
    await ctx.db.delete(args.folderId);
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

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
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
      // Update to new folder
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
