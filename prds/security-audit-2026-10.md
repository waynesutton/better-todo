# Security audit of the public Convex surface

Created: 2026-10-10 07:21 UTC
Last Updated: 2026-10-10 07:21 UTC
Status: Done

## Problem

The MCP security pass flagged `users.storeUser` as public with no auth check. A full sweep of every public function was needed to find other gaps before the MCP work ships.

## Method

- Listed every exported `query`, `mutation`, `action` in `convex/` (138) and flagged handlers with no reference to `ctx.auth`, `getUserIdentity`, or `getUserId` (8)
- Read each flagged function and classified it as a gap or intentionally public
- Checked scheduler and cron targets for `api.*`, `VITE_*` env names, CORS, and HTML output in `http.ts`
- `npm audit --omit=dev`
- Probed the dev deployment with no auth token for each fixed function, the MCP internals, and `/mcp`

## Findings and fixes

| Severity | Finding | Fix | Re-proof (dev, no token) |
| --- | --- | --- | --- |
| High | `dateLabels` get, set and remove hardcoded `userId = "demo-user"`. Every user, signed in or not, read and wrote one shared label set | Use `getUserId`. Query returns `[]` when signed out, mutations throw `Not authenticated` | get returns `[]`, set throws `Not authenticated` |
| Medium | `users.storeUser` public, no auth, trusted `args.userId`. Anyone could overwrite any user's stored name and email | Require identity and `identity.subject === args.userId` | throws `Not authenticated` |
| Medium | `getNoteBySlug` returned the owner's Clerk `userId` on public share pages | Dropped `userId` from the return validator and object. `SharedNoteView` never read it | returns projection without `userId` |
| Critical (dep) | `@clerk/shared` and `@clerk/clerk-react` advisories, plus `react-router`, `axios`, `form-data`, `js-cookie`, `follow-redirects`, AI SDK | `npm audit fix`, no major bumps. Clerk now 5.61.10, react-router-dom 7.18.4 | build, typecheck, tests pass |
| Low | `/meta/share` put the slug into an `href` and inline script unescaped. Not exploitable today since only stored slugs matching `[a-zA-Z0-9_-]` render | `encodeURIComponent` on the slug | static |
| Low | `generateWeeklyRecapIntoNote` ownership check used `.filter` on a `by_user` range | Direct `get` plus userId comparison | tests pass |
| Low | `unsplash.fetchBackgroundImage` was callable without auth and spent Unsplash quota for anyone | Removed the action, its internal `updateBackgroundImage` mutation, and the call in `PomodoroTimer.tsx`. The 7 pomodoro ownership checks moved from `.filter` range scans to `getOwnedSession` (direct get plus userId) | "Could not find public function" |

## Checked and fine

- `checkSlugAvailability`, `getNoteBySlug`, `getStats` are intentionally public. `getStats` returns counts only
- MCP internals (`mcpTools:*`, `mcp:createApiKeyForUser`, `agentToolMutations:*`) return "Could not find public function"
- `/mcp` returns 401 with no token and with a bad token
- `mcp:createApiKey` throws `Not signed in`. `listConnections` and `listMyAgentActivity` return `[]` signed out
- No scheduler or cron target uses `api.*`
- `VITE_*` names are publishable only (Clerk publishable key, frontend API URL, Convex URLs)
- `Access-Control-Allow-Origin: *` is only on the public `/meta/share` HTML endpoint

## Not fixed

- `@ai-sdk/provider-utils` pins `undici` 5, which bundles `@fastify/busboy` with multipart parsing advisories (2 high, 4 moderate). The app does not parse untrusted multipart through it. Forcing an override risks breaking the AI calls; wait for an upstream bump
- Labels saved before this fix live under `userId = "demo-user"` with no owner. They no longer show for anyone. Dev has 1 such row. Production count not checked

## Verification

- `npx tsc -p convex --noEmit`, `npm run build`, `npx vitest run` (10/10), `npx convex dev --once`, `npx convex-doctor --score` (100)
- Unauthenticated curl probes against the dev deployment, results in the table above
