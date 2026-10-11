---
name: deployprod
description: Use when the user says /deployprod, deploy prod, deploy production, upload production static hosting, or asks to deploy the current app to its production Convex static-hosting target.
---

# Deploy Prod

Use this skill for a production `@convex-dev/static-hosting` deploy in the current repo.

Source of truth:

- Component repo: `https://github.com/get-convex/static-hosting`
- Component docs: `https://www.convex.dev/components/static-hosting`
- Custom domains: `https://docs.convex.dev/production/custom-domains`

## Portable Assumptions

- The current repo is a Convex app that uses `@convex-dev/static-hosting`.
- Prefer project scripts in `package.json` when present.
- The common static hosting component name is `staticHosting`, but do not hard-code it if the repo defines another name.
- Discover the component name from `convex/convex.config.ts` when needed by looking for `app.use(staticHosting, { name: "..." })`.
- If no component name is configured, use `staticHosting`.

## Required Rules

- Prefer the repo's full production deploy script when one exists, commonly `npm run deploy`.
- Use static-only production upload only when backend functions, schema, auth routes, and Convex components are already deployed.
- Do not run `npm run build` separately before static upload. Static-hosting's `--build` flag injects the correct `VITE_CONVEX_URL`.
- Do not assume a specific production URL. Read the public site URL and Convex cloud URL from command output.
- Keep production as the canonical target in SEO, Open Graph, Twitter card, sitemap, robots, GitHub Auth callback URLs, `SITE_URL`, and `CONVEX_SITE_URL`.

## `/deployprod` Workflow

1. Run quick checks unless the user explicitly says to skip them. Use the scripts that exist in the current repo:

   ```bash
   npm run typecheck
   npm run lint
   ```

2. Inspect available deploy scripts:

   ```bash
   npm run
   ```

3. Prefer the repo's full production deploy script:

   ```bash
   npm run deploy
   ```

4. If no full deploy script exists, deploy backend first, then upload production static hosting:

   ```bash
   npx convex deploy --yes
   npx @convex-dev/static-hosting upload --build -c staticHosting --prod
   ```

   Replace `staticHosting` with the configured component name if different.

5. If a static-only production script exists and backend is already deployed, this is acceptable:

   ```bash
   npm run deploy:static:prod
   ```

6. Confirm deploy output includes:

   ```text
   Deploying to production environment
   Your app is now available at: <production convex site URL>
   ```

7. Smoke check the production page using the URL printed by deploy output:

   ```bash
   curl -L -s <production convex site URL> | rg '/assets/index-|VITE_CONVEX_URL|<production deployment slug>'
   ```

   Also check that the known dev deployment slug is not present if the repo has one documented.

## Troubleshooting

- If production static upload fails with `Could not find function for 'staticHosting:generateUploadUrls'`, deploy backend first:

  ```bash
  npx convex deploy --yes
  ```

  Then rerun the static-hosting production upload.

- If the shell cannot reach Convex because of sandboxed network restrictions, rerun the same command with the required network approval.

## When To Update Project Docs

Update docs only if deploy behavior changes:

- `README.md`
- `changelog.md`
- `task.md`
- `files.md`

If the deploy behavior change is non-trivial, create a PRD in `prds/`.
