import type { QueryCtx, MutationCtx } from "../_generated/server";

// Default timezone when a user has never set one. Matches weekly recap.
export const DEFAULT_TIMEZONE = "America/Los_Angeles";

// Format a timestamp as YYYY-MM-DD in a given IANA timezone
export function formatDateInTz(ms: number, timezone: string): string {
  const d = new Date(ms);
  const y = d.toLocaleString("en-CA", { timeZone: timezone, year: "numeric" });
  const m = d.toLocaleString("en-CA", { timeZone: timezone, month: "2-digit" });
  const dd = d.toLocaleString("en-CA", { timeZone: timezone, day: "2-digit" });
  return `${y}-${m}-${dd}`;
}

// Today's date (YYYY-MM-DD) in the given timezone. Falls back to the default
// timezone when the stored value is not a valid IANA name.
export function todayFor(timezone: string, nowMs: number = Date.now()): string {
  try {
    return formatDateInTz(nowMs, timezone);
  } catch {
    return formatDateInTz(nowMs, DEFAULT_TIMEZONE);
  }
}

// Strict YYYY-MM-DD check that also rejects impossible dates like 2026-02-30
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Read the user's saved timezone, or the default
export async function getUserTimezone(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<string> {
  const prefs = await ctx.db
    .query("userPreferences")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return prefs?.timezone ?? DEFAULT_TIMEZONE;
}
