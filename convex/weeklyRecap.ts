"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Week runs Saturday 00:00 through Friday 14:00 in user's local timezone.
// The "weekKey" is the Friday date string (YYYY-MM-DD) that closes the window.

// TZ-aware week boundary helpers
function getWeekBounds(nowMs: number, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(nowMs));
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const hour = parseInt(get("hour"));
  const weekday = get("weekday");

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = dayMap[weekday] ?? 0;

  return { hour, dow };
}

function formatDateInTz(ms: number, timezone: string): string {
  const d = new Date(ms);
  const y = d.toLocaleString("en-CA", { timeZone: timezone, year: "numeric" });
  const m = d.toLocaleString("en-CA", { timeZone: timezone, month: "2-digit" });
  const dd = d.toLocaleString("en-CA", { timeZone: timezone, day: "2-digit" });
  return `${y}-${m}-${dd}`;
}

// Get a UTC timestamp for a local date+time in a timezone
function getTimestampForLocalTime(
  dateStr: string,
  timeStr: string,
  timezone: string,
): number {
  const isoGuess = `${dateStr}T${timeStr}:00.000Z`;
  const guessMs = new Date(isoGuess).getTime();

  const localStr = new Date(guessMs).toLocaleString("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const [localH, localM] = localStr.split(":").map(Number);
  const [targetH, targetM] = timeStr.split(":").map(Number);

  const diffMin = (localH - targetH) * 60 + (localM - targetM);
  return guessMs + diffMin * 60000;
}

function getWeekTimestampBounds(
  nowMs: number,
  timezone: string,
): { startMs: number; endMs: number; fridayDate: string; saturdayDate: string } {
  const { dow } = getWeekBounds(nowMs, timezone);

  // Days back to Saturday 00:00
  const daysBackToSat = dow === 6 ? 0 : (dow + 1) % 7;
  const approxSatMs = nowMs - daysBackToSat * 86400000;
  const saturdayDate = formatDateInTz(approxSatMs, timezone);

  const satInTz = getTimestampForLocalTime(saturdayDate, "00:00", timezone);

  // Friday 14:00 is 6 days after Saturday 00:00 + 14 hours
  const friEndMs = satInTz + 6 * 86400000 + 14 * 3600000;
  const fridayDate = formatDateInTz(friEndMs, timezone);

  return {
    startMs: satInTz,
    endMs: Math.min(friEndMs, nowMs),
    fridayDate,
    saturdayDate,
  };
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

// Hourly cron tick: check each user and generate recap if it's their Friday 2pm
export const tick = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const nowMs = Date.now();

    // Single query fetches all users with their timezone
    const users = await ctx.runQuery(
      internal.weeklyRecapQueries.listUsersWithTimezone,
      {},
    );

    // Filter to only users whose local time is Friday 14:xx
    const eligible = users.filter((user) => {
      const { dow, hour } = getWeekBounds(nowMs, user.timezone);
      return dow === 5 && hour === 14;
    });

    // Schedule recap generation for each eligible user
    for (const user of eligible) {
      await ctx.runAction(internal.weeklyRecap.generateRecapForUser, {
        userId: user.userId,
        nowMs,
      });
    }

    return null;
  },
});

// Generate the weekly recap for a single user
export const generateRecapForUser = internalAction({
  args: {
    userId: v.string(),
    nowMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const timezone = await ctx.runQuery(
      internal.weeklyRecapQueries.getUserTimezone,
      { userId: args.userId },
    );

    const { startMs, endMs, fridayDate, saturdayDate } =
      getWeekTimestampBounds(args.nowMs, timezone);

    // Dedupe check
    const existingNoteId = await ctx.runQuery(
      internal.weeklyRecapQueries.getExistingRecap,
      { userId: args.userId, weekKey: fridayDate },
    );
    if (existingNoteId) return null;

    const completedTodos = await ctx.runQuery(
      internal.weeklyRecapQueries.getCompletedTodosInRange,
      { userId: args.userId, startMs, endMs },
    );

    if (completedTodos.length === 0) return null;

    const title = `Weekly Recap: ${formatShortDate(saturdayDate)} - ${formatShortDate(fridayDate)}`;

    let content: string;
    try {
      content = await generateAISummary(
        ctx,
        args.userId,
        completedTodos,
        saturdayDate,
        fridayDate,
      );
    } catch {
      content = buildPlainRecap(completedTodos, saturdayDate, fridayDate);
    }

    await ctx.runMutation(internal.weeklyRecapQueries.createRecapNote, {
      userId: args.userId,
      weekKey: fridayDate,
      title,
      content,
      date: fridayDate,
    });

    return null;
  },
});

// Generate recap for a specific note (used by manual trigger)
export const generateRecapIntoNote = internalAction({
  args: {
    userId: v.string(),
    noteId: v.id("fullPageNotes"),
    nowMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const timezone = await ctx.runQuery(
      internal.weeklyRecapQueries.getUserTimezone,
      { userId: args.userId },
    );

    const { startMs, endMs, fridayDate, saturdayDate } =
      getWeekTimestampBounds(args.nowMs, timezone);

    const completedTodos = await ctx.runQuery(
      internal.weeklyRecapQueries.getCompletedTodosInRange,
      { userId: args.userId, startMs, endMs },
    );

    const title = `Weekly Recap: ${formatShortDate(saturdayDate)} - ${formatShortDate(fridayDate)}`;

    let content: string;
    if (completedTodos.length === 0) {
      content = `# ${title}\n\nNo todos were completed this week (${formatShortDate(saturdayDate)} - ${formatShortDate(fridayDate)}).`;
    } else {
      try {
        content = await generateAISummary(
          ctx,
          args.userId,
          completedTodos,
          saturdayDate,
          fridayDate,
        );
      } catch {
        content = buildPlainRecap(completedTodos, saturdayDate, fridayDate);
      }
    }

    await ctx.runMutation(internal.weeklyRecapQueries.patchRecapNote, {
      noteId: args.noteId,
      title,
      content,
    });

    return null;
  },
});

// AI summary generation using user's API keys
async function generateAISummary(
  ctx: any,
  userId: string,
  completedTodos: Array<{ content: string; date?: string; completedAt: number }>,
  saturdayDate: string,
  fridayDate: string,
): Promise<string> {
  const availableKeys = await ctx.runQuery(
    internal.userApiKeys.getAvailableApiKeys,
    { userId },
  );

  let useProvider: "anthropic" | "openai" | null = null;
  let apiKey: string | null = null;

  if (availableKeys.anthropicAvailable) {
    useProvider = "anthropic";
    apiKey = availableKeys.anthropicKey;
  } else if (availableKeys.openaiAvailable) {
    useProvider = "openai";
    apiKey = availableKeys.openaiKey;
  }

  if (!useProvider || !apiKey) {
    throw new Error("No API key available");
  }

  const todoList = completedTodos
    .map((t) => `- ${t.content}${t.date ? ` (${t.date})` : ""}`)
    .join("\n");

  const systemPrompt = `You are a concise weekly productivity summarizer. Given a list of completed todos, produce a markdown document with two sections:

1. "Summary" - A bullet-point list of accomplishments. Group related items. Each bullet should be a clear, action-oriented statement of what was achieved. Keep it concise.

2. "Completed Todos" - The original todo items listed as-is for reference.

Do not add any preamble, greeting, or sign-off. Output clean markdown only.`;

  const userMessage = `Week: ${formatShortDate(saturdayDate)} - ${formatShortDate(fridayDate)}

Completed todos (${completedTodos.length} items):
${todoList}`;

  if (useProvider === "anthropic") {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text ?? buildPlainRecap(completedTodos, saturdayDate, fridayDate);
  } else {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    return (
      response.choices[0]?.message?.content ??
      buildPlainRecap(completedTodos, saturdayDate, fridayDate)
    );
  }
}

function buildPlainRecap(
  completedTodos: Array<{ content: string; date?: string; completedAt: number }>,
  saturdayDate: string,
  fridayDate: string,
): string {
  const lines = [
    `# Weekly Recap: ${formatShortDate(saturdayDate)} - ${formatShortDate(fridayDate)}`,
    "",
    `## Summary`,
    "",
    `${completedTodos.length} todo${completedTodos.length === 1 ? "" : "s"} completed this week.`,
    "",
    `## Completed Todos`,
    "",
    ...completedTodos.map(
      (t) => `- ${t.content}${t.date ? ` (${t.date})` : ""}`,
    ),
  ];
  return lines.join("\n");
}
