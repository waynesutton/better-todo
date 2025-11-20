import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  internalAction,
  QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

// Helper to get streak for a user
async function getStreak(ctx: QueryCtx, userId: string) {
  return await ctx.db
    .query("streaks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export const getStreakStatus = query({
  args: {},
  returns: v.union(
    v.object({
      currentStreak: v.number(),
      longestStreak: v.number(),
      weeklyProgress: v.any(),
      totalTodosCompleted: v.number(),
      lastCompletedDate: v.string(),
      hasUnseenBadges: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const streak = await getStreak(ctx, identity.subject);
    if (!streak) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        weeklyProgress: {},
        totalTodosCompleted: 0,
        lastCompletedDate: "",
        hasUnseenBadges: false,
      };
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      weeklyProgress: streak.weeklyProgress || {},
      totalTodosCompleted: streak.totalTodosCompleted,
      lastCompletedDate: streak.lastCompletedDate,
      hasUnseenBadges: streak.hasUnseenBadges || false,
    };
  },
});

export const getBadges = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("badges"),
      _creationTime: v.number(),
      userId: v.string(),
      slug: v.string(),
      name: v.string(),
      description: v.string(),
      imageUrl: v.string(),
      earnedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("badges")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

// Called when a todo is completed or uncompleted
export const updateStreak = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD of the todo
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, date } = args;

    // Check if all todos for this date are completed
    // Only track regular todos with a date (exclude folder todos, backlog todos, and pinned todos)
    const allTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", date),
      )
      .collect();

    // Filter to only include regular date-based todos (not in folders, not backlog, not pinned, not archived)
    const todos = allTodos.filter(
      (t) => !t.folderId && !t.backlog && !t.pinned && !t.archived,
    );

    if (todos.length === 0) return null;

    const allCompleted = todos.every((t) => t.completed);

    let streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!streak) {
      const id = await ctx.db.insert("streaks", {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: "",
        weeklyProgress: {},
        totalTodosCompleted: 0,
      });
      streak = (await ctx.db.get(id))!;
    }

    // Update total completed count - only count regular date-based todos
    const allCompletedTodos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("completed"), true))
      .collect();

    // Filter to only count regular date-based todos (exclude folder/backlog/pinned todos)
    const totalCompleted = allCompletedTodos.filter(
      (t) => t.date && !t.folderId && !t.backlog && !t.pinned,
    ).length;

    // Check for first todo milestone - grant badge if user doesn't have it yet
    // This ensures users get the badge even if they had completed todos before streaks feature was added
    console.log(`[Streaks] Total completed: ${totalCompleted}`);
    if (totalCompleted >= 1) {
      const existing = await ctx.db
        .query("badges")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("slug"), "first-todo"))
        .first();
      if (!existing) {
        console.log(
          "[Streaks] Scheduling 'First Step' badge generation (first completed todo)",
        );
        await ctx.scheduler.runAfter(0, internal.streaks.generateBadge, {
          userId,
          slug: "first-todo",
          name: "First Step",
          description: "Completed your first todo",
        });
      } else {
        console.log("[Streaks] 'First Step' badge already exists");
      }
    }

    // Update weekly progress
    const weeklyProgress =
      (streak.weeklyProgress as Record<string, boolean>) || {};
    const wasCompleted = weeklyProgress[date] === true;

    if (allCompleted && !wasCompleted) {
      weeklyProgress[date] = true;

      // Calculate new streak
      let newStreak = streak.currentStreak;
      if (streak.lastCompletedDate === "") {
        newStreak = 1;
      } else {
        const lastDate = new Date(streak.lastCompletedDate + "T00:00:00");
        const currentDate = new Date(date + "T00:00:00");
        const diffTime = currentDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays === 0) {
          // Same day, keep streak
        } else {
          newStreak = 1;
        }
      }

      await ctx.db.patch(streak._id, {
        weeklyProgress,
        lastCompletedDate: date,
        currentStreak: newStreak,
        longestStreak: Math.max(streak.longestStreak, newStreak),
        totalTodosCompleted: totalCompleted,
      });

      // Check for first day complete badge
      console.log("[Streaks] Day completed, checking for 'Day One Done' badge");
      const firstDayBadge = await ctx.db
        .query("badges")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("slug"), "first-day"))
        .first();
      if (!firstDayBadge) {
        console.log("[Streaks] Scheduling 'Day One Done' badge generation");
        await ctx.scheduler.runAfter(0, internal.streaks.generateBadge, {
          userId,
          slug: "first-day",
          name: "Day One Done",
          description: "Completed all todos for a single day",
        });
      } else {
        console.log("[Streaks] 'Day One Done' badge already exists");
      }

      // Check for streak milestones
      const milestones = [3, 5, 7, 10, 30, 60, 90, 365];
      if (milestones.includes(newStreak)) {
        const existingBadge = await ctx.db
          .query("badges")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("slug"), `${newStreak}-day-streak`))
          .first();

        if (!existingBadge) {
          await ctx.scheduler.runAfter(0, internal.streaks.generateBadge, {
            userId,
            slug: `${newStreak}-day-streak`,
            name: `${newStreak} Day Streak`,
            description: `Completed all todos for ${newStreak} consecutive days`,
          });
        }
      }
    } else if (!allCompleted && wasCompleted) {
      // User uncompleted a task, mark day as incomplete
      weeklyProgress[date] = false;
      await ctx.db.patch(streak._id, {
        weeklyProgress,
        totalTodosCompleted: totalCompleted,
      });
    } else {
      // Just update the total count
      await ctx.db.patch(streak._id, {
        totalTodosCompleted: totalCompleted,
      });
    }

    return null;
  },
});

export const generateBadge = internalAction({
  args: {
    userId: v.string(),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(
      `[Streaks] Generating badge: ${args.name} (${args.slug}) for user ${args.userId}`,
    );

    if (!process.env.OPENAI_API_KEY) {
      console.error(
        "[Streaks] OPENAI_API_KEY not found in environment variables",
      );
      return null;
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
Generate a single achievement badge designed for a web application.

1. Style Requirements
• Soft 3D clay or plastic aesthetic with smooth, rounded shapes
• Bright, playful color palettes with subtle gradients for depth 
• Surfaces should look molded, lightweight, and friendly
• No metallic rendering, no hard specular highlights, no realism
• No drop shadows, no cast shadows, no environmental lighting

2. Background Requirements
• Output must have a fully transparent background
• Do not include a white or colored backdrop, gradient, vignette, or platform
• Badge must be isolated, centered, and clean for direct use as a PNG in React

3. Shape Language
• Use geometric and abstract shapes such as shields, circles, hexagons, crests, diamonds, layered plates, wings, rays, or symbolic marks
• No text, numbers, letters, or typography
• No animals, characters, faces, or emojis
• Internal emblem must be abstract or symbolic (examples: star, burst, diamond facet, ring, layered shape, glyph-like mark)

4. Rendering Rules
• Soft lighting only, no sharp reflections
• Color is allowed but must remain harmonious 
• No outlines unless subtle and stylistic
• Badge must remain readable at small sizes

5. Randomization
Each output must be unique. Randomly vary:
• Base silhouette
• Internal symbol
• Layer count and stacking
• Color palette
• Soft lighting direction

6. Output Specification
• Render a single badge in high detail
• Fully transparent background (no white)
• Centered composition with clean edges
• No drop shadow, no floor, no props, no scene
`;

    try {
      console.log("[Streaks] Calling OpenAI DALL-E 3 API...");
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      });

      if (!response.data || response.data.length === 0) {
        console.error("[Streaks] OpenAI returned no image data");
        throw new Error("No image data returned");
      }

      const image = response.data[0].b64_json;
      if (!image) {
        console.error("[Streaks] No base64 image in response");
        throw new Error("No image generated");
      }

      console.log(
        "[Streaks] Successfully received badge image from OpenAI, storing in Convex...",
      );

      // Convert base64 to blob
      const binaryString = atob(image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes.buffer], { type: "image/png" });

      // Store in Convex Storage
      const storageId = await ctx.storage.store(blob);
      const imageUrl = await ctx.storage.getUrl(storageId);

      if (imageUrl) {
        console.log(
          `[Streaks] Badge stored, saving to database with URL: ${imageUrl}`,
        );
        await ctx.runMutation(internal.streaks.saveBadge, {
          userId: args.userId,
          slug: args.slug,
          name: args.name,
          description: args.description,
          imageUrl: imageUrl,
        });
        console.log("[Streaks] Badge saved successfully!");
      }
    } catch (e) {
      console.error("[Streaks] Failed to generate badge:", e);
    }

    return null;
  },
});

export const saveBadge = internalMutation({
  args: {
    userId: v.string(),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    imageUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if badge already exists (prevent duplicates from race conditions)
    const existing = await ctx.db
      .query("badges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();

    // Early return if badge already exists (idempotent)
    if (existing) {
      console.log(
        `[Streaks] Badge '${args.slug}' already exists for user, skipping insert`,
      );
      return null;
    }

    // Insert the new badge
    await ctx.db.insert("badges", {
      userId: args.userId,
      slug: args.slug,
      name: args.name,
      description: args.description,
      imageUrl: args.imageUrl,
      earnedAt: Date.now(),
    });

    console.log(`[Streaks] Successfully saved new badge '${args.slug}' for user`);

    // Mark that user has unseen badges
    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (streak) {
      await ctx.db.patch(streak._id, {
        hasUnseenBadges: true,
      });
      console.log("[Streaks] Marked hasUnseenBadges = true for user");
    }

    return null;
  },
});

export const markBadgesAsSeen = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (streak && streak.hasUnseenBadges) {
      await ctx.db.patch(streak._id, {
        hasUnseenBadges: false,
      });
      console.log("[Streaks] Marked badges as seen for user");
    }

    return null;
  },
});
