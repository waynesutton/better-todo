<!-- 7547c129-d682-44a2-9c75-46ec5804781e aad87ee1-5384-4a29-96d0-adb8bffa50bc -->

# Add Clerk auth, gate features, and unsigned ephemeral mode

## Goals

- Add Clerk to React app with modal-based <SignIn /> and <UserProfile /> that match site UI.
- Hook Clerk to Convex so each signed-in user only sees their own data.
- When signed out:
- Show a clear banner under current date: "Sign in to save todos and notes."
- Allow creating/using todos and notes in-memory only (lost on refresh).
- Search is blocked with a modal prompting sign-in.
- When signed in: banner and blocks disappear and everything persists.

## Key changes

- Wrap app with `ClerkProvider` and sync Clerk tokens to Convex client via `convex.setAuth`.
- Replace DEMO user usage in Convex functions with `identity.subject`. Reject mutations when not authenticated; queries return empty when not authenticated.
- Sidebar login button uses theme-aware icon; shows `<SignIn />` modal when signed out and `<UserProfile />` modal when signed in. After sign-in, icon switches to user profile icon.
- Add a small banner under the current date when signed out.
- Gate search button: if signed out, show a friendly modal prompting sign-in instead of opening the search modal.
- Add an ephemeral local data layer (in-memory) that mirrors the minimal CRUD used by the UI and is activated when signed out.
- Style Clerk components via `appearance` to match site UI.

## Files to change

- `package.json`
- Add `@clerk/clerk-react` dependency.

- `src/main.tsx`
- Wrap with `ClerkProvider` using `VITE_CLERK_PUBLISHABLE_KEY`.
- Sync token to Convex: `convex.setAuth(async () => await getToken({ template: "convex" }))` (null when signed out), per docs.

- `src/App.tsx`
- Import Clerk hooks (`useAuth`) and a new `AuthModals` state.
- Add sign-in/profile modals rendering `<SignIn />` and `<UserProfile />` with `appearance` matching site.
- Gate search button click: when signed out, open "Sign in to search" modal (reuse `ConfirmDialog` with a Sign in action).
- Show banner below current date when signed out.
- Integrate ephemeral mode: when signed out, use local data for todos/notes instead of Convex queries; when signed in, use Convex data.

- `src/components/Sidebar.tsx`
- Use Clerk `useAuth` or `useUser` to know signed state.
- Change login button to open sign-in modal when signed out; when signed in, switch to `user-light.svg`/`user-dark.svg` and open profile modal.

- `src/components/SearchModal.tsx`
- No logic change; opening gated in `App`.

- `src/components/NotesSection.tsx`, `src/components/TodoItem.tsx`, `src/components/TodoList.tsx`
- Add optional callbacks to operate on local data when signed out; fall back to Convex mutations when signed in.
- Keep types intact.

- `src/lib/localData.ts` (new)
- In-memory store keyed by date for todos and notes mirroring CRUD used by UI (create, update, delete, reorder, move, copy, archive, delete archived, archive all, etc.). Lost on reload.

- Convex backend: `convex/todos.ts`, `convex/notes.ts`, `convex/search.ts`
- Replace `DEMO_USER_ID` with:
- `const identity = await ctx.auth.getUserIdentity();`
- If no identity: for queries return `[]`; for mutations `throw new Error("Not authenticated")`.
- Use `const userId = identity.subject;` for filters and writes.

- Optional: `convex/users.ts` and `convex/schema.ts`
- Leave table as-is to minimize scope. We're not using WorkOS; future pass can adapt to Clerk if needed.

## UI/UX specifics

- Clerk appearance: tune to site (rounded corners, neutral colors, font). Respect light/dark via ThemeContext.
- Use existing modal patterns (like `SearchModal` and `ConfirmDialog`) to avoid browser default dialogs.
- Place the warning banner just under the header date text in `App`.

## Testing flow

1. Signed out:

- Banner visible; search click shows sign-in prompt modal.
- Add todos/notes → visible; reload → gone.

2. Sign in via sidebar icon:

- Clerk modal opens; after sign-in, icon switches to user profile icon.
- Banner and search block disappear; data now persists per user.

3. Data isolation: create items as user A, sign out, sign in as user B → A's data not visible.

## Implementation todos

- setup-clerk-provider: Add ClerkProvider, set Convex auth with Clerk getToken
- add-auth-modals: Add sign-in and profile modals with appearance
- gate-search: Block search when signed out with prompt
- add-warning-banner: Show "Sign in to save todos and notes" under date
- sidebar-login-profile: Toggle icon and actions based on signed state
- ephemeral-layer: Implement local in-memory CRUD and wire when signed out
- convex-auth-identity: Use ctx.auth.getUserIdentity() in todos/notes/search
- types-pass: Verify types, adjust props and handlers for local mode

### Implementation Notes

**Completed Implementation:**

1. **ClerkProvider Setup** ✅
   - Added `@clerk/clerk-react` dependency
   - Wrapped app with `ClerkProvider` using `VITE_CLERK_PUBLISHABLE_KEY`
   - Synced Clerk tokens to Convex using `convex.setAuth(async () => await getToken({ template: "convex" }))`

2. **Authentication Modals** ✅
   - Added SignIn and UserProfile modals with theme-aware appearance
   - Custom styling to match site UI (dark/light mode support)
   - Removed "Don't have an account?" links since sidebar has dedicated buttons

3. **Search Gating** ✅
   - Search button shows "Sign In to Search" modal when signed out
   - Keyboard shortcut (Cmd/Ctrl+K) respects authentication state
   - Search only works for authenticated users

4. **Warning Banner** ✅
   - Shows "Sign in to save todos and notes. Data will be lost on refresh." when signed out
   - Positioned under current date header

5. **Sidebar Authentication** ✅
   - Login button shows SignIn modal when signed out
   - User profile button shows UserProfile modal when signed in
   - Theme-aware icons (user-light.svg/user-dark.svg, login-light.svg/login-dark.svg)

6. **Ephemeral Mode** ✅
   - Created `src/lib/localData.ts` for in-memory storage
   - Unsigned users can create/edit todos and notes locally
   - Data lost on refresh (ephemeral behavior)

7. **Convex Authentication** ✅
   - Replaced `DEMO_USER_ID` with `ctx.auth.getUserIdentity()`
   - Queries return empty arrays when not authenticated
   - Mutations throw "Not authenticated" error when called without auth
   - Each user sees only their own data

8. **UI Improvements** ✅
   - Clerk button styling: white text in light mode, black text in dark mode
   - OTP code field styling with blue accent border
   - Authentication popup for "+ add note" button when not signed in
   - Custom confirmation dialogs for sign-in prompts

### Key Technical Decisions

- **Token Template**: Used "convex" template for Clerk JWT tokens
- **Authentication State**: Used `useConvexAuth()` hook for reliable auth state
- **Modal Management**: Reused existing ConfirmDialog component for sign-in prompts
- **Theme Integration**: Clerk components respect app's dark/light theme
- **Error Handling**: Graceful fallback to local storage when not authenticated

### Migration from WorkOS

- Removed `@workos-inc/authkit-react` and `@convex-dev/workos` packages
- Removed Netlify Functions for WorkOS OAuth
- Updated environment variables from `VITE_WORKOS_*` to `VITE_CLERK_*`
- Users need to sign up again with Clerk (WorkOS sessions incompatible)
