# WorkOS AuthKit Integration Plan

## Current State Analysis

Your app is already well-prepared for authentication:

- Schema has `userId` fields in all tables (`todos`, `notes`, `archivedDates`, `dateLabels`)
- Proper indexes exist (`by_user_and_date`, `by_user`)
- All Convex functions use hardcoded `userId = "anonymous"`
- Frontend has no authentication UI or providers

## Installation and Dependencies

**Install required packages:**

```bash
npm install @workos-inc/authkit-react @convex-dev/workos
```

**Remove unused dependency:**

```bash
npm uninstall @convex-dev/auth
```

## Backend Configuration

### Create `convex/auth.config.ts`

This file configures Convex to validate WorkOS JWT tokens:

```typescript
const clientId = process.env.WORKOS_CLIENT_ID;

const authConfig = {
  providers: [
    {
      type: "customJwt",
      issuer: `https://api.workos.com/`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
  ],
};

export default authConfig;
```

### Update all Convex functions

Replace hardcoded `const userId = "anonymous"` with actual user authentication:

**In `convex/todos.ts` (16 functions):**

- Replace `const userId = "anonymous"` with:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Unauthenticated");
}
const userId = identity.subject;
```

**In `convex/notes.ts` (5 functions):**

- Same replacement pattern

**In `convex/dates.ts` and `convex/archivedDates.ts` (if they exist):**

- Same replacement pattern for any functions using userId

## Frontend Configuration

### Update `src/main.tsx`

Replace `ConvexProvider` with WorkOS-enabled providers:

```typescript
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";

// Wrap with AuthKitProvider and ConvexProviderWithAuthKit
<AuthKitProvider
  clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
  redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
>
  <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </ConvexProviderWithAuthKit>
</AuthKitProvider>
```

### Update `src/App.tsx`

Implement lazy authentication pattern:

1. Import auth components:

```typescript
import { useConvexAuth } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
```

2. Keep the main app UI always visible (no `<Authenticated>` wrapper)
3. Show empty state when unauthenticated (no todos/notes load)
4. Add user profile button in sidebar header showing login status
5. When authenticated, show logout button and user info

### Create authentication components

**New file:** `src/components/AuthButton.tsx`

- When unauthenticated: Show "Sign In" button
- When authenticated: Show user profile with:
  - User's first name from `useAuth().user.firstName`
  - User avatar/profile picture if available from `useAuth().user.profilePictureUrl`
  - Fallback to first letter of name in circle if no avatar
  - Clicking opens dropdown menu with "Sign Out" option
- Display user email as secondary text if showing full profile
- Clean, minimal design matching app aesthetic

**New file:** `src/components/LoginPrompt.tsx`

- Modal/dialog that appears when unauthenticated user tries to create todo or note
- Explains that login is required to save todos
- Primary action: "Sign In to Continue" button
- Secondary action: "Cancel" button
- Clean, minimal design matching app aesthetic

### Update todo and note creation components

**In `src/components/TodoList.tsx` and `src/components/NotesSection.tsx`:**

1. Import `useConvexAuth` to check authentication status
2. Before calling `createTodo` or `createNote` mutations:
   - Check if `isAuthenticated` is false
   - If unauthenticated, show `LoginPrompt` modal instead
   - If authenticated, proceed with creation
3. Handle the modal state (open/close)

## Environment Variables

### Create `.env.local`

```
VITE_CONVEX_URL=<your-existing-convex-url>
VITE_WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXXXXXXXX
VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback
```

### Convex Dashboard

Set environment variable in your Convex deployment:

- `WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXXXXXXXX`

## WorkOS Dashboard Setup

1. Sign up at workos.com or use automatic provisioning via Convex CLI
2. Set up AuthKit in the WorkOS Dashboard
3. Configure redirect URI: `http://localhost:5173/callback`
4. Configure CORS: Add `http://localhost:5173` to allowed origins
5. Copy Client ID to environment variables
6. For production: Add production domain to redirect URIs and CORS

## Deployment Steps

1. Create `convex/auth.config.ts`
2. Run `npx convex dev` (will prompt for WORKOS_CLIENT_ID env var)
3. Set WORKOS_CLIENT_ID in Convex dashboard via provided link
4. Update all Convex functions to use `ctx.auth.getUserIdentity()`
5. Install npm packages
6. Update `src/main.tsx` with new providers
7. Update `src/App.tsx` with auth guards
8. Create `.env.local` with WorkOS credentials
9. Test login/logout flow
10. Update `.gitignore` to exclude `.env.local`

## Files to Create

- `convex/auth.config.ts`
- `src/components/AuthButton.tsx`
- `src/components/LoginPrompt.tsx`
- `.env.local`

## Files to Modify

- `package.json` (dependencies)
- `src/main.tsx` (providers)
- `src/App.tsx` (auth guards)
- `convex/todos.ts` (all 16 functions)
- `convex/notes.ts` (all 5 functions)
- `convex/dates.ts` (if exists)
- `convex/archivedDates.ts` (if exists)
- `.gitignore` (add `.env.local`)

## Testing Checklist

- User can sign up with email
- User can sign in
- User can sign out
- Todos are private to each user
- Notes are private to each user
- Dates are private to each user
- Multiple users can use app simultaneously with separate data
- Data persists after logout/login
- Unauthenticated users can view empty app
- Login prompt appears when trying to create first todo/note
- User avatar and first name display after login

## Implementation Todos

- [ ] Install @workos-inc/authkit-react and @convex-dev/workos packages, remove unused @convex-dev/auth
- [ ] Create convex/auth.config.ts with WorkOS JWT configuration
- [ ] Update all Convex functions (todos.ts, notes.ts, dates.ts, archivedDates.ts) to use ctx.auth.getUserIdentity() instead of hardcoded anonymous userId
- [ ] Create .env.local with WorkOS credentials and update .gitignore
- [ ] Update src/main.tsx to use AuthKitProvider and ConvexProviderWithAuthKit
- [ ] Update src/App.tsx with Authenticated/Unauthenticated guards and create AuthButton component for login/logout
- [ ] Deploy auth.config.ts and set WORKOS_CLIENT_ID environment variable in Convex dashboard
- [ ] Set up WorkOS account, configure AuthKit, redirect URIs, and CORS settings
