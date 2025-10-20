import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserId } from "./users";

// Get all month groups for the current user with their dates
export const getMonthGroups = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("monthGroups"),
      _creationTime: v.number(),
      userId: v.string(),
      monthName: v.string(),
      year: v.number(),
      month: v.number(),
      archived: v.boolean(),
      dates: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const monthGroups = await ctx.db
      .query("monthGroups")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Fetch dates for each month group
    const monthGroupsWithDates = await Promise.all(
      monthGroups.map(async (monthGroup) => {
        const monthGroupDates = await ctx.db
          .query("monthGroupDates")
          .withIndex("by_user_and_month_group", (q) =>
            q.eq("userId", userId).eq("monthGroupId", monthGroup._id),
          )
          .collect();

        const dates = monthGroupDates
          .map((mgd) => mgd.date)
          .sort()
          .reverse();

        return {
          ...monthGroup,
          dates,
        };
      }),
    );

    // Sort by year and month (most recent first)
    return monthGroupsWithDates.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  },
});

// Get dates for a specific month group
export const getMonthGroupDates = query({
  args: { monthGroupId: v.id("monthGroups") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const monthGroupDates = await ctx.db
      .query("monthGroupDates")
      .withIndex("by_user_and_month_group", (q) =>
        q.eq("userId", userId).eq("monthGroupId", args.monthGroupId),
      )
      .collect();

    return monthGroupDates
      .map((mgd) => mgd.date)
      .sort()
      .reverse();
  },
});

// Get month group for a specific date
export const getMonthGroupForDate = query({
  args: { date: v.string() },
  returns: v.union(v.id("monthGroups"), v.null()),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const monthGroupDate = await ctx.db
      .query("monthGroupDates")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .first();

    return monthGroupDate?.monthGroupId ?? null;
  },
});

// Auto-create month groups for completed months
export const autoCreateMonthGroups = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Get all dates with todos/notes
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get unique dates
    const uniqueDates = Array.from(new Set(todos.map((t) => t.date)));

    // Group dates by month
    const datesByMonth = new Map<string, string[]>();
    for (const dateStr of uniqueDates) {
      const date = new Date(dateStr + "T00:00:00");
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      // Only consider completed months (not current month)
      if (
        year < currentYear ||
        (year === currentYear && month < currentMonth)
      ) {
        const key = `${year}-${month}`;
        if (!datesByMonth.has(key)) {
          datesByMonth.set(key, []);
        }
        datesByMonth.get(key)!.push(dateStr);
      }
    }

    // Create month groups for months that don't have them yet
    for (const [key, dates] of datesByMonth) {
      const [yearStr, monthStr] = key.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      // Check if month group already exists
      const existingGroups = await ctx.db
        .query("monthGroups")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const existingGroup = existingGroups.find(
        (g) => g.year === year && g.month === month,
      );

      if (!existingGroup) {
        // Create month group
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const monthName = `${monthNames[month - 1]} ${year}`;

        const monthGroupId = await ctx.db.insert("monthGroups", {
          userId,
          monthName,
          year,
          month,
          archived: false,
        });

        // Associate dates with month group
        for (const date of dates) {
          // Check if date is not already in a month group
          const existingDate = await ctx.db
            .query("monthGroupDates")
            .withIndex("by_user_and_date", (q) =>
              q.eq("userId", userId).eq("date", date),
            )
            .first();

          if (!existingDate) {
            await ctx.db.insert("monthGroupDates", {
              userId,
              monthGroupId,
              date,
            });
          }
        }
      }
    }

    return null;
  },
});

// Archive a month group
export const archiveMonthGroup = mutation({
  args: { monthGroupId: v.id("monthGroups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const monthGroup = await ctx.db.get(args.monthGroupId);
    if (!monthGroup || monthGroup.userId !== userId) {
      throw new Error("Month group not found");
    }

    await ctx.db.patch(args.monthGroupId, { archived: true });
    return null;
  },
});

// Unarchive a month group
export const unarchiveMonthGroup = mutation({
  args: { monthGroupId: v.id("monthGroups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const monthGroup = await ctx.db.get(args.monthGroupId);
    if (!monthGroup || monthGroup.userId !== userId) {
      throw new Error("Month group not found");
    }

    await ctx.db.patch(args.monthGroupId, { archived: false });
    return null;
  },
});

// Delete a month group and all its associations
export const deleteMonthGroup = mutation({
  args: { monthGroupId: v.id("monthGroups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const monthGroup = await ctx.db.get(args.monthGroupId);
    if (!monthGroup || monthGroup.userId !== userId) {
      throw new Error("Month group not found");
    }

    // Delete all month-date associations
    const monthGroupDates = await ctx.db
      .query("monthGroupDates")
      .withIndex("by_user_and_month_group", (q) =>
        q.eq("userId", userId).eq("monthGroupId", args.monthGroupId),
      )
      .collect();

    for (const mgd of monthGroupDates) {
      await ctx.db.delete(mgd._id);
    }

    // Delete the month group
    await ctx.db.delete(args.monthGroupId);
    return null;
  },
});
