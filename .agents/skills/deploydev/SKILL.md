---
name: deploydev
description: Use when the user says /deploydev, deploy dev, upload dev static hosting, or asks to deploy the current app to its development Convex static-hosting target.
---

# Deploy Dev

Use this skill for a development `@convex-dev/static-hosting` upload in the current repo.

Source of truth:

- Component repo: `https://github.com/get-convex/static-hosting`
- Component docs: `https://www.convex.dev/components/static-hosting`

## Portable Assumptions

- The current repo is a Convex app that uses `@convex-dev/static-hosting`.
- Prefer project scripts in `package.json` when present.
- The common static hosting component name is `staticHosting`, but do not hard-code it if the repo defines another name.
- Discover the component name from `convex/convex.config.ts` when needed by looking for `app.use(staticHosting, { name: "..." })`.
- If no component name is configured, use `staticHosting`.

## Required Rules

- Use this only when the user explicitly asks for dev.
- Do not update public metadata to the dev URL.
- Do not run `npm run build` separately before static upload. Static-hosting's `--build` flag injects the correct `VITE_CONVEX_URL`.
- Do not deploy production backend functions from this workflow.
- Do not assume a specific Convex deployment URL. Read the URL from command output.

## `/deploydev` Workflow

1. Confirm the user asked for dev.

2. Inspect available scripts:

   ```bash
   npm run
   ```

3. Prefer the repo script when available:

   ```bash
   npm run deploy:static:dev
   ```

4. If no script exists, discover the component name and run the static-hosting upload directly:

   ```bash
   npx @convex-dev/static-hosting upload --build -c staticHosting --dev
   ```

   Replace `staticHosting` with the configured component name if different.

5. Confirm deploy output includes:

   ```text
   Deploying to development environment
   Your app is now available at: <dev convex site URL>
   ```

6. Report the dev URL exactly as printed and remind that it is not the public/canonical app.

## Troubleshooting

- If the upload cannot find static-hosting functions, run the app's dev Convex workflow first, usually:

  ```bash
  npx convex dev --once
  ```

- If the shell cannot reach Convex because of sandboxed network restrictions, rerun the same command with the required network approval.

## When To Update Project Docs

Update docs only if deploy behavior changes:

- `README.md`
- `changelog.md`
- `task.md`
- `files.md`

If the deploy behavior change is non-trivial, create a PRD in `prds/`.
