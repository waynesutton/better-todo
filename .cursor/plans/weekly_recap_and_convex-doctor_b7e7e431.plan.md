---
name: Weekly recap and convex-doctor
overview: Add a Saturday–Friday (through Friday 2pm per-user timezone) weekly recap as a new dated full-page note with AI bullets paired to original todo text, plus a manual “fill empty note” path. Install convex-doctor, add a Cursor skill and rule, and remediate Convex backend issues until the score is at least 90 without regressing features.
todos:
  - id: schema-recap
    content: Add userPreferences.timezone, todos.completedAt + index, weeklyRecapRuns table; wire updateTodo to set/clear completedAt
    status: completed
  - id: weekly-recap-backend
    content: Implement convex/crons.ts hourly tick, internal weekly recap action (TZ week bounds, dedupe, AI content, create/patch fullPageNote on Friday date)
    status: completed
  - id: manual-ui
    content: Public mutation for empty full-page note + UI entry in existing full-page note menu with loading state
    status: completed
  - id: client-tz
    content: Sync browser IANA timezone to userPreferences when missing
    status: completed
  - id: convex-doctor
    content: Add convex-doctor devDep, script, toml; create SKILL + rule; run -v and fix to score >= 90
    status: completed
isProject: false
---

# Weekly recap + convex-doctor hardening

## Context from the repo

- Todos live in [`convex/schema.ts`](convex/schema.ts) / [`convex/todos.ts`](convex/todos.ts): `completed` and `archived` are toggled together on check-off; there is **no `completedAt`**, so “completed this week” cannot be inferred reliably from `date` alone (todos move between days).
- Full-page notes are created via [`convex/fullPageNotes.ts`](convex/fullPageNotes.ts) (`createFullPageNote` requires `date` **or** `folderId`). Weekly recap notes should be **date-scoped on the closing Friday** so they appear in the existing Notes UX for that day.
- AI calls already exist in [`convex/agentTaskActions.ts`](convex/agentTaskActions.ts) (`processWithClaude` / `processWithOpenAI`, task prompts). Recap generation should **reuse the same provider/key selection pattern** as agent tasks ([`internal.userApiKeys.getAvailableApiKeys`](convex/userApiKeys.ts)) to avoid duplicating key logic.
- There is **no** [`convex/crons.ts`](convex/crons.ts) yet; PRDs reference one but it is not wired. Convex expects a default-exported `cronJobs()` instance.
- A quick `npx convex-doctor --score` run reported **49**; reaching **90+** will mean fixing **errors** first (weighted heavily), then high-impact **warnings**, and using [`convex-doctor.toml`](https://github.com/nooesc/convex-doctor) only for narrow false positives.

## Part A: “Current date” and week boundaries (Sat → Fri 14:00, per-user TZ)

**Timezone (your choice): per-user IANA timezone**

1. **Schema**: Add optional `timezone` to [`userPreferences`](convex/schema.ts) (e.g. `v.optional(v.string())`).
2. **Client**: On authenticated load (e.g. [`src/App.tsx`](src/App.tsx) or existing preferences bootstrap), if `timezone` is missing, call a small mutation `setTimezoneIfMissing` that writes `Intl.DateTimeFormat().resolvedOptions().timeZone`.
3. **Server-side week math** (in a `"use node"` internal action or shared Node helper used only from actions): use `date-fns` + TZ-aware dates. Define the **closing instant** as **this week’s Friday at 14:00** in the user’s timezone, and **week start** as the **preceding Saturday at 00:00** (same TZ). Persist helpers as pure functions + tests via manual scenarios (no `Date.now()` inside **queries**; actions/crons may use `Date.now()`).
4. **Hourly cron gate**: Add [`convex/crons.ts`](convex/crons.ts) with `crons.interval(..., { hours: 1 }, internal.weeklyRecap.tick, {})`. Each tick runs an **internalAction** that:
   - Loads users in **bounded batches** (e.g. `ctx.db.query("users").take(N)` — avoids `perf/unbounded-collect` where possible).
   - For each user, resolves `timezone` from `userPreferences` with fallback `America/Los_Angeles`.
   - If local time is **Friday** and hour is **14**, enqueue or run recap for the week that **just closed** at that 14:00 boundary (define precisely in code comments so UI and cron agree).

**Tracking completions for the week**

5. **Schema**: Add `completedAt: v.optional(v.number())` on `todos`. Add index `by_user_and_completedAt` on `["userId", "completedAt"]` so the recap job can query completions in a **time range** without scanning all todos (addresses doctor performance rules and scales better than “scan every date string in the window”).
6. **Mutation**: In [`updateTodo`](convex/todos.ts), when `completed` transitions to `true`, set `completedAt: Date.now()`; when transitioning to `false`, clear `completedAt`. Keep behavior idempotent.
7. **Recap eligibility**: Include rows where `type === "todo"`, `completed === true`, `completedAt` within `[weekStart, weekEnd]` (and exclude `folderId` / `backlog` unless you explicitly expand scope later). For **legacy** todos with `completed` but no `completedAt`, optional fallback: also include if `archived && completed && date` falls in the set of calendar dates touched by the window (document as best-effort only).

**Idempotency / dedupe**

8. **Schema**: New table `weeklyRecapRuns`: `userId`, `weekKey` (stable string, e.g. ISO date of closing Friday in TZ), `noteId`, `createdAt`, index `by_user_and_weekKey` unique via application check. Before creating a note, insert-or-skip so Friday hourly tick does not duplicate notes if retried.

**Note creation + AI content**

9. **Internal flow** (all `internal*` except one public “manual” mutation):
   - `internalMutation` creates a new full-page note on the **Friday date** (YYYY-MM-DD in user TZ) via same insert shape as [`createFullPageNote`](convex/fullPageNotes.ts) (title like `Week of Sat M/D – Fri M/D`, `content: ""` initially) or builds markdown in memory then inserts once.
   - `internalAction` loads completion rows (via `ctx.runQuery`), builds a structured prompt: list of **original todo `content` strings** + dates, asks the model for **bullet accomplishments** where **each bullet must reference the corresponding original todo text** (so “summary next to original” is enforced structurally). Reuse Claude/OpenAI call style from [`agentTaskActions.ts`](convex/agentTaskActions.ts).
   - `internalMutation` `patch`es the note content (single write). If no API key, skip creation or create a stub note with a short user-visible message (decide one behavior and keep it consistent).

10. **Manual run (empty full-page note)**: Public `mutation` e.g. `generateWeeklyRecapIntoNote({ noteId })`:
    - Auth + ownership via indexed query on `fullPageNotes` (same patterns as other mutations in [`fullPageNotes.ts`](convex/fullPageNotes.ts)).
    - Require `content.trim() === ""` (and optionally `title` is default/untitled if you want stricter safety).
    - Schedule the same internal action with `noteId` + `userId` so **one code path** serves cron and manual.
    - **Do not** use browser `confirm`; use existing modal/confirm components ([`ConfirmDialog`](src/components/ConfirmDialog.tsx) pattern).

11. **UI hook**: In full-page note chrome (likely [`FullPageNoteTabs.tsx`](src/components/FullPageNoteTabs.tsx) or the menu that already exposes “Send to agent” / “Run” in [`App.tsx`](src/App.tsx)), add a menu item **only when the active note is empty**, calling the new mutation, with loading/disabled state (avoids `client/mutation-in-render`).

## Part B: convex-doctor install, skill, rule, score 90+

**Install and scripts**

1. Add **devDependency** `convex-doctor` (npm package exists at `0.3.3`).
2. Add npm script, e.g. `"convex-doctor": "convex-doctor"`.
3. Add root [`convex-doctor.toml`](https://github.com/nooesc/convex-doctor): ignore `_generated`, set `[ci] fail_below = 90` only if you want CI enforcement (optional; can start without failing CI).

**Skill + Cursor rule**

4. Add [`.cursor/skills/convex-doctor/SKILL.md`](.cursor/skills/convex-doctor/SKILL.md) (or your preferred skills path) describing: when to run it, how to read `-v` output, category weights, and the project’s remediation order (errors before warnings, avoid blanket rule offs).
5. Add [`.cursor/rules/convex-doctor.mdc`](.cursor/rules/convex-doctor.mdc) with globs for `convex/**/*.ts` pointing agents to run `npm run convex-doctor` after substantive backend edits.

**Remediation strategy (score 49 → 90+)**

6. Run `npx convex-doctor -v` and fix in this order (per doctor weighting):
   - **Correctness errors**: unawaited promises, `ctx.db` in actions, query side effects, generated file edits, cron referencing `api.*`, etc.
   - **Security errors**: missing arg validators, internal/api misuse, HTTP auth/CORS issues ([`convex/http.ts`](convex/http.ts) may need explicit auth or documented public exception + CORS headers if flagged).
   - **Performance errors**: `Date.now()` inside queries, unbounded `.collect()`, looped `ctx.runMutation` / `runQuery`.
7. For warnings that remain expensive to fix (e.g. `arch/monolithic-file`), selectively disable **only** those rules in `convex-doctor.toml` after verifying they are noise, so the **weighted** score still clears 90 without hiding real errors.

## Files likely touched

| Area           | Files                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schema / recap | [`convex/schema.ts`](convex/schema.ts), new `convex/weeklyRecap.ts` (internal query/mutation/action), [`convex/todos.ts`](convex/todos.ts), new [`convex/crons.ts`](convex/crons.ts) |
| AI reuse       | [`convex/agentTaskActions.ts`](convex/agentTaskActions.ts) (extract small shared helper **only if** it reduces duplication without risky refactor)                                   |
| Client         | [`src/App.tsx`](src/App.tsx) or preferences hook, full-page note menu component                                                                                                      |
| Doctor         | `package.json`, `convex-doctor.toml`, `.cursor/skills/convex-doctor/SKILL.md`, `.cursor/rules/convex-doctor.mdc`, targeted fixes across `convex/*.ts` per `-v` output                |

## Risk notes

- **Cron + scale**: `users.take(N)` caps users per hour; document `N` and increase or add pagination if you grow past that.
- **AI cost**: Automatic weekly notes call the model for every eligible user at their Friday hour; consider skipping when completion list is empty.
- **Doctor refactors**: broad “fix all warnings” can touch many files; keep changes mechanical and covered by `convex dev` + smoke test of todos, full-page notes, agent tasks, and shared notes.
