# Grok Bot and MCP agents for better todo

## Problem

Users want Grok Bot (and Claude, Cursor, any MCP client) to read and write their todos, day notes, full page notes and projects. Each user needs their own connection that they can see and revoke. "Today" has to mean the user's day, not UTC.

## Approach

- `@convex-dev/mcp` (pinned `0.1.0-alpha.7`) runs the MCP server inside the Convex deployment at `https://<deployment>.convex.site/mcp`
- The component owns OAuth (Claude, Cursor), API keys (Grok Bot), token storage, scopes and argument plus return validation
- Every tool acts only as `user.userId`. No tool argument picks whose data is touched. Every id the model passes is ownership checked, and a foreign id gets the same "not found" as a missing one
- Tools call internal functions in `convex/mcpTools.ts`, which reuse the same helpers the UI mutations use (`convex/lib/userData.ts`), so streaks, archive on complete and ordering behave the same
- Dates resolve through `convex/lib/time.ts`: the user's saved timezone, falling back to America/Los_Angeles

## Scopes

| Scope | Allows |
| --- | --- |
| `todos:read` | `list_today`, `search` (todo results) |
| `todos:write` | `add_todo`, `complete_todo`, `update_todo` |
| `notes:read` | `get_note`, note results in `list_today` and `search` |
| `notes:write` | `add_note`, `update_note` |
| `projects:read` | `list_projects`, `get_project` |

There are no delete tools. `update_note` defaults to append, and replace is marked destructive.

## Smart matching

Tools accept a `match` phrase instead of an id. Resolution order:

1. Exact id
2. Exact case insensitive text, then a single substring match (`matchInCode`)
3. TypeSafe (`convex/lib/typesafe.ts`) ranks up to 50 candidates. The code acts only above a threshold: 0.85 for todos and notes, 0.65 for projects
4. Anything else returns `ambiguous` with ranked candidates so the agent asks the user

TypeSafe is optional. With no `TYPESAFE_API_KEY`, an error, or a 3 second timeout, matching falls back to step 4. Only candidate titles and the match phrase are sent.

Eval (`npx convex run mcpEval:run`, 18 synthetic cases): no wrong picks. Misses all declined to act. Project partial names like "launch" now resolve in code.

## Activity

Every write logs one `mcpActivity` row (tool, short summary, date, match confidence). No tokens and no full note content. Settings shows the last 20. A daily cron deletes rows older than 30 days.

## UI

- Settings (press ?) has a Connected agents section: MCP URL with copy, create an API key (shown once), connection list with revoke, recent activity
- Collapsed "Grok Bot setup prompt" (native `details`, closed by default) with a copy button. It includes the MCP URL and transport but never the key. It tells Grok Bot to request the key through a masked secret request, stop and point to connector settings if it can't, never store the key in files, notes, memory, skills or the terminal, and confirm with `list_today`. Grok Bot's computer is shared by every Bot on the account, so the key must not be written to it (docs.x.ai/grok-bot/computer-and-apps)
- `/connect` consent page: Clerk sign in, client name labeled unverified, scopes, device code confirmation, redirect host, refuses to render in a frame. Netlify sends `frame-ancestors 'none'`

## Security notes

- The Convex admin MCP (`npx convex mcp`) is for development only. It is never given to Grok Bot
- `TYPESAFE_API_KEY` is set with `npx convex env set` only
- `users.storeUser` had no auth check. Fixed in the follow-up audit, see prds/security-audit-2026-10.md

## Deploy steps

1. `npx convex deploy`
2. `npx convex env set MCP_CONSENT_URL https://better-todo.co/connect --prod`
3. Deploy Netlify so `/connect` and its headers ship
