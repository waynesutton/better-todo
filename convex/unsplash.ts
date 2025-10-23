"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Fetch a random nature image from Unsplash and update session
// To change background image categories, modify the queries array below
// Examples: "mountains", "forest", "desert", "architecture", "sunset"
export const fetchBackgroundImage = action({
  args: { sessionId: v.id("pomodoroSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Random search queries for variety - customize these to your preference
    const queries = ["landscape nature", "cities", "ocean", "sky"];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];

    try {
      const accessKey = process.env.UNSPLASH_ACCESS_KEY;
      if (!accessKey) {
        console.error("UNSPLASH_ACCESS_KEY not configured");
        return null;
      }

      const response = await fetch(
        `https://api.unsplash.com/photos/random?query=${encodeURIComponent(randomQuery)}&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${accessKey}`,
          },
        },
      );

      if (!response.ok) {
        console.error("Failed to fetch Unsplash image:", response.statusText);
        return null;
      }

      const data = await response.json();
      const imageUrl = data.urls?.regular;

      if (imageUrl) {
        await ctx.runMutation(api.pomodoro.updateBackgroundImage, {
          sessionId: args.sessionId,
          imageUrl,
        });
      }
    } catch (error) {
      console.error("Error fetching Unsplash image:", error);
    }

    return null;
  },
});

