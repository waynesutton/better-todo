---
name: convex-self-hosting
description: Integrate Convex static self hosting into existing apps using the latest upstream instructions from get-convex/self-hosting every time. Use when setting up upload APIs, HTTP routes, deployment scripts, migration from external hosting, or troubleshooting static deploy issues across React, Vite, Next.js, and other frontends.
---

# Convex self hosting skill

Use this skill to integrate Convex based static hosting in a repeatable way across projects.

## Non negotiable update check

Run this check before making any code changes or giving setup advice.

Preferred command:

```bash
bash .agents/skills/convex-self-hosting/scripts/check-upstream.sh
```

1. Read latest integration guide:
   - `https://raw.githubusercontent.com/get-convex/self-hosting/main/INTEGRATION.md`
2. Read latest README manual setup section:
   - `https://github.com/get-convex/self-hosting?tab=readme-ov-file#manual-setup-1`
3. Read Convex docs index for current guidance:
   - `https://docs.convex.dev/llms.txt`
4. Confirm package publish state:
   - `npm view @convex-dev/self-hosting version`

If upstream docs conflict with local rules, follow upstream docs and explain what changed.

## Clarifying questions you must ask first

Ask these before implementing:

1. Confirm `get-convex/self-hosting` is the source of truth for this setup.
2. Is the target app Vite, Next.js, Expo web export, or another bundler.
3. Do they want root path hosting or a prefix like `/app`.
4. Do they want one shot deploy or separate backend and static deploy steps.
5. If package is unpublished, do they want:
   - GitHub dependency install
   - vendored local copy
   - wait for npm release

Never assume unpublished package install details.

## Install strategy

### Path A published package

If npm package exists, use the package directly.

```bash
npm install @convex-dev/self-hosting
```

### Path B package not published yet

If package is missing on npm, use GitHub source and pin to commit or tag.

```bash
npm install github:get-convex/self-hosting#main
```

If project policy requires deterministic builds, ask for a commit SHA and pin to it.

## Required file changes

Use the latest upstream file patterns from `INTEGRATION.md`.

### 1) `convex/convex.config.ts`

```typescript
import { defineApp } from "convex/server";
import selfHosting from "@convex-dev/self-hosting/convex.config";

const app = defineApp();
app.use(selfHosting);

export default app;
```

### 2) `convex/staticHosting.ts`

```typescript
import { components } from "./_generated/api";
import {
  exposeUploadApi,
  exposeDeploymentQuery,
} from "@convex-dev/self-hosting";

export const { generateUploadUrl, recordAsset, gcOldAssets, listAssets } =
  exposeUploadApi(components.selfHosting);

export const { getCurrentDeployment } =
  exposeDeploymentQuery(components.selfHosting);
```

### 3) `convex/http.ts`

```typescript
import { httpRouter } from "convex/server";
import { registerStaticRoutes } from "@convex-dev/self-hosting";
import { components } from "./_generated/api";

const http = httpRouter();

registerStaticRoutes(http, components.selfHosting);

export default http;
```

Optional prefix mode:

```typescript
registerStaticRoutes(http, components.selfHosting, {
  pathPrefix: "/app",
  spaFallback: true,
});
```

### 4) `package.json` scripts

```json
{
  "scripts": {
    "deploy": "npx @convex-dev/self-hosting deploy",
    "deploy:static": "npx @convex-dev/self-hosting upload --build --prod"
  }
}
```

## Deployment flow

### First setup

```bash
npm install @convex-dev/self-hosting
npx @convex-dev/self-hosting setup
npx convex dev --once
npm run deploy
```

### Ongoing deploys

```bash
npm run deploy
```

### Two step deploy alternative

```bash
npx convex deploy
npx @convex-dev/self-hosting upload --build --prod
```

Always use the tool driven build flow. Do not run `npm run build` first when using upload deploy commands.

## Cross app support notes

- Vite: use `--build` flow as default.
- Next.js and Expo: pass through `VITE_CONVEX_URL` in the app build script as documented upstream.
- Existing API routes: prefer `pathPrefix: "/app"` for static hosting.
- Keep upload APIs internal only and never expose them as public HTTP actions.

## Integration with convex agent plugins

If `get-convex/convex-agent-plugins` is present, follow its Convex rules with this skill:

- keep validators on all Convex functions
- keep internal functions for upload operations
- use indexed reads, avoid broad filtering in data access patterns
- preserve strict TypeScript in generated Convex and frontend code

Reference:
- `https://github.com/get-convex/convex-agent-plugins`

## Troubleshooting checklist

1. `404` for static routes:
   - verify `convex/http.ts` exists and exports router.
2. `Cannot find module .../convex.config`:
   - verify package install source and import path.
3. wrong backend URL in built assets:
   - redeploy with CLI `--build` flow.
4. no updates visible:
   - clear cache and verify deployment ID changes.
5. HTTP actions disabled:
   - run `npx convex dev` once to push backend state.

## Completion requirements

Before finishing, provide:

1. exact upstream docs commit date or latest retrieval timestamp
2. which package path was selected and why
3. list of changed files
4. commands the user should run next

Never claim setup is complete without showing these four outputs.

## Source links

- `https://github.com/get-convex/self-hosting`
- `https://raw.githubusercontent.com/get-convex/self-hosting/main/INTEGRATION.md`
- `https://github.com/get-convex/self-hosting?tab=readme-ov-file#manual-setup-1`
- `https://docs.convex.dev/llms.txt`
- `https://github.com/get-convex/convex-agent-plugins`
- `https://github.com/agentskills/agentskills`
