# How This App Works

Technical documentation for the npm package directory submission and AI review system.

## Rate Limits and High Volume Submission Concerns

This section covers potential issues when the app receives many submissions and how to prevent rate limiting from npm, GitHub, and AI services.

### Current Rate Limit Exposure

**npm Registry API**

- Endpoint: `registry.npmjs.org/{package}`
- Rate limits: Not officially documented, but npm can throttle aggressive requesters
- Risk level: Low to Medium

**npm Downloads API**

- Endpoint: `api.npmjs.org/downloads/point/last-week/{package}`
- Rate limits: Approximately 1000 requests per minute for unauthenticated clients
- Risk level: Low

**GitHub API**

- Endpoint: `api.github.com/repos/{owner}/{repo}/contents/{path}`
- Unauthenticated: 60 requests per hour
- Authenticated: 5000 requests per hour
- Risk level: High (each AI review makes multiple GitHub calls)

**Anthropic Claude API**

- Depends on your pricing tier
- Risk level: Medium (cost implications at scale)

### Current Mitigations

1. **GitHub Authentication**: The app uses `GITHUB_TOKEN` environment variable for authenticated requests, increasing the limit from 60 to 5000 requests per hour.

2. **Parallel Fetches**: npm registry and downloads API calls use `Promise.all()` to minimize total request time per submission.

3. **Background Processing**: AI reviews run via `ctx.scheduler.runAfter(0, ...)` so they don't block the submission response.

4. **Duplicate Check**: The app queries by package name before submission to prevent duplicate entries.

### Recommended Improvements for High Volume

**Request Queuing**

Add a submission queue with rate limiting using Convex scheduled functions:

```typescript
// Process one submission every 2 seconds
ctx.scheduler.runAfter(2000 * queuePosition, api.packages.processSubmission, { ... })
```

**Caching npm Metadata**

Store fetched npm data with a TTL. Before fetching, check if recent data exists:

```typescript
const cached = await ctx.db
  .query("npmCache")
  .withIndex("by_name_and_time", (q) =>
    q.eq("name", packageName).gte("fetchedAt", Date.now() - 3600000),
  )
  .first();
```

**GitHub API Batching**

For AI reviews, batch multiple file fetches into fewer API calls by using the GitHub Trees API instead of individual content requests.

**Submission Cooldown**

Add rate limiting per submitter email:

```typescript
const recentSubmission = await ctx.db
  .query("packages")
  .withIndex("by_submitter_email_and_time", (q) =>
    q.eq("submitterEmail", email).gte("submittedAt", Date.now() - 60000),
  )
  .first();

if (recentSubmission) {
  throw new Error("Please wait 60 seconds between submissions");
}
```

## Data Flow Overview

```
User submits npm URL
       │
       ▼
┌─────────────────────┐
│  Parse package name │
│  from npm URL       │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Check for existing │
│  package by name    │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Fetch npm metadata │────▶│  registry.npmjs.org │
└─────────────────────┘     └─────────────────────┘
       │
       ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Fetch download     │────▶│  api.npmjs.org      │
│  statistics         │     └─────────────────────┘
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Insert package     │
│  into Convex DB     │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  If auto-review on, │
│  schedule AI review │
└─────────────────────┘
```

## NPM Data Fetching

The app fetches package data from two npm endpoints in `convex/packages.ts`.

### Registry Metadata Endpoint

```
https://registry.npmjs.org/{package-name}
```

For scoped packages like `@convex-dev/agent`, the slash is encoded:

```
https://registry.npmjs.org/@convex-dev%2Fagent
```

**Data extracted:**

- Package name
- Description
- Latest version number
- License
- Repository URL (cleaned from git+/.../.git format)
- Homepage URL
- Unpacked size
- File count
- Last publish date
- Maintainers list (names converted to Gravatar URLs)

### Downloads Endpoint

```
https://api.npmjs.org/downloads/point/last-week/{package-name}
```

Returns weekly download count. If this endpoint fails, the app defaults to 0 downloads rather than failing the submission.

### URL Parsing

The submission form accepts npm package URLs in this format:

```
https://www.npmjs.com/package/@scope/package-name
https://www.npmjs.com/package/package-name
```

Regex pattern used:

```javascript
/npmjs\.com\/package\/((?:@[^/]+\/)?[^/?#]+)/;
```

## GitHub Data Fetching for AI Review

The AI review system fetches source code from GitHub to analyze Convex component compliance. This happens in `convex/aiReview.ts`.

### Repository URL Extraction

Repository URLs are extracted from npm metadata and cleaned:

- Removes `git+` prefix
- Removes `.git` suffix

Example: `git+https://github.com/get-convex/convex-helpers.git` becomes `https://github.com/get-convex/convex-helpers`

### File Discovery

The app searches for `convex.config.ts` in multiple locations:

```
convex/src/component/convex.config.ts
convex/component/convex.config.ts
convex/convex.config.ts
src/component/convex.config.ts
src/convex.config.ts
convex.config.ts
packages/component/convex.config.ts
lib/convex.config.ts
```

Once found, it fetches TypeScript files from the same or adjacent directories.

### GitHub API Calls Per Review

Each AI review makes approximately:

- 1 to 8 calls to find `convex.config.ts`
- 1 call to list directory contents
- 1 to N calls to fetch individual TypeScript files

Total: 3 to 15 API calls per review

### Authentication

```typescript
const headers: Record<string, string> = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "Convex-NPM-Directory",
};

if (githubToken) {
  headers["Authorization"] = `Bearer ${githubToken}`;
}
```

## AI Review Process

The AI review uses Anthropic Claude to analyze Convex component code against 10 criteria.

### Review Criteria

**Critical (must pass):**

1. Has `convex.config.ts` with `defineComponent()`
2. Has component functions (queries, mutations, actions)
3. Functions use new syntax (`query({...})`)
4. All functions have `returns:` validator
5. Uses `v.null()` for void returns

**Non-critical:**

6. Indexes follow `by_field1_and_field2` naming convention
7. Uses `withIndex()` instead of `filter()`
8. Internal functions use `internalQuery`, etc.
9. Has TypeScript with proper `Id<"table">` types
10. Uses token-based authorization when applicable

### Auto-Approve and Auto-Reject

Admin settings control automatic status changes:

- **Auto-approve on pass**: If all criteria pass, package is approved automatically
- **Auto-reject on fail**: If any critical criteria fail, package is rejected automatically

These settings are stored in the `adminSettings` table and checked after each AI review.

### AI Review Status Values

- `not_reviewed`: Default state
- `reviewing`: AI analysis in progress
- `passed`: All criteria met
- `partial`: Non-critical failures only
- `failed`: Critical criteria failed
- `error`: Review process encountered an error

## Database Schema

### Packages Table

Stores all npm package submissions with:

- Package metadata from npm
- Submitter information (name, email, Discord)
- Review status (pending, in_review, approved, changes_requested, rejected)
- Visibility (visible, hidden, archived)
- AI review results (status, summary, criteria array, error)
- Featured flag

### Indexes Used

- `by_name`: Quick lookup for duplicate checking
- `by_submitted_at`: Sort packages by submission date
- `by_review_status`: Filter packages by review state
- `by_visibility`: Filter public vs hidden packages
- Search indexes for name, description, and maintainer names

## Admin NPM Data Refresh

Admins can refresh package data from npm at any time using the refresh button in the admin panel. This fetches the latest metadata without affecting review status or submitter information.

### How It Works

1. Admin clicks the refresh button (ArrowClockwise icon) next to a package
2. The app calls `refreshNpmData` action with the package ID
3. Action fetches fresh data from npm registry and downloads API
4. Updates only npm-sourced fields while preserving:
   - Submitter information (name, email, Discord)
   - Review status and reviewer info
   - Visibility settings
   - Featured flag
   - AI review results
   - Demo URL

### Data Flow

```
Admin clicks refresh
       │
       ▼
┌─────────────────────┐
│  Get package name   │
│  from database      │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Fetch fresh npm    │────▶│  registry.npmjs.org │
│  metadata           │     └─────────────────────┘
└─────────────────────┘
       │
       ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Fetch download     │────▶│  api.npmjs.org      │
│  statistics         │     └─────────────────────┘
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Update package     │
│  (patch only npm    │
│  sourced fields)    │
└─────────────────────┘
```

### Fields Updated on Refresh

- Description
- Version
- License
- Repository URL
- Homepage URL
- Unpacked size
- Total files
- Last publish date
- Weekly downloads
- Collaborators/Maintainers

### Use Cases

- Package author publishes a new version
- Weekly download counts need updating
- Maintainer list changed
- Description or license updated on npm

## Error Handling

### npm Fetch Failures

If the registry fetch fails, the submission is rejected with an error message. Download count failures are handled gracefully (defaults to 0).

### GitHub Fetch Failures

If GitHub is unreachable or the repository doesn't exist:

- AI review returns `partial` status
- Summary explains the limitation
- Manual review is still possible

### AI API Failures

If Claude API fails:

- Review status set to `error`
- Error message stored in `aiReviewError` field
- Admin can retry the review later

## References

- npm Registry API: https://docs.npmjs.com/
- npm Downloads API: https://github.com/npm/registry/blob/main/docs/download-counts.md
- GitHub REST API: https://docs.github.com/en/rest
- Convex Components: https://docs.convex.dev/components/authoring
