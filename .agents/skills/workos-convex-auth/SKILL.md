---
name: workos-convex-auth
description: Set up and configure WorkOS AuthKit authentication with Convex backend. Use when integrating AuthKit, configuring JWT providers, setting up environment variables, or implementing sign in and sign out flows with React and Vite. Supports Netlify deployment.
---

# WorkOS Convex Auth Skill

> **Always check official docs for the latest information:**
> - Convex + WorkOS: https://docs.convex.dev/auth/authkit/
> - WorkOS AuthKit: https://workos.com/docs/authkit
> - AuthKit React SDK: https://workos.com/docs/sdks/authkit-react
> - Auto provisioning: https://docs.convex.dev/auth/authkit/auto-provision
> - Netlify Docs: https://docs.netlify.com/

## When to use this skill

Use this skill when you need to:

- Set up WorkOS AuthKit with a Convex backend
- Configure dual JWT providers for SSO and User Management
- Set environment variables for localhost and production
- Implement sign in, sign out, and callback flows
- Access user identity in Convex functions
- Configure admin access checks based on email domain

## Architecture overview

The authentication flow works as follows:

1. User clicks Sign In on the frontend
2. WorkOS AuthKit redirects to hosted login page
3. User authenticates (Google, GitHub, email, etc.)
4. WorkOS redirects back to `/callback` with auth code
5. AuthKit exchanges code for session tokens
6. Convex validates JWT tokens against WorkOS JWKS endpoint
7. `ctx.auth.getUserIdentity()` returns user claims from JWT

## Required packages

```bash
npm install @workos-inc/authkit-react @convex-dev/workos
```

## Configuration files

### convex/auth.config.ts

WorkOS issues JWTs from two different issuers. Configure both:

```typescript
const clientId = process.env.WORKOS_CLIENT_ID;

export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://api.workos.com/",
      algorithm: "RS256",
      applicationID: clientId,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
    {
      type: "customJwt",
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256",
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};
```

Key points:
- Both providers use the same JWKS endpoint
- First provider handles SSO authentication
- Second provider handles User Management (email, social login)
- The `applicationID` is only needed for the SSO provider

### Frontend setup (React/Vite)

```typescript
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
const redirectUri = import.meta.env.VITE_WORKOS_REDIRECT_URI;

createRoot(document.getElementById("root")!).render(
  <AuthKitProvider
    clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
    redirectUri={redirectUri}
  >
    <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
      <App />
    </ConvexProviderWithAuthKit>
  </AuthKitProvider>
);
```

## Environment variables

### Frontend (.env.local)

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXX
VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback
```

### Convex Dashboard

Set in Environment Variables section:

```
WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXX
```

### WorkOS Dashboard Configuration

1. **Redirect URIs**: Add callback URLs
   - `http://localhost:5173/callback` (development)
   - `https://yourdomain.netlify.app/components/callback` (Netlify production)
   - `https://yourdomain.com/callback` (custom domain production)

2. **CORS Origins**: Add allowed origins
   - `http://localhost:5173` (development)
   - `https://yourdomain.netlify.app` (Netlify production)
   - `https://yourdomain.com` (custom domain production)

3. **JWT Template**: Configure email claim (see JWT claims section)

### Netlify Deployment Configuration

When deploying to Netlify, configure environment variables in Netlify Dashboard:

1. Go to Site Settings > Environment Variables
2. Add the following variables:
   - `VITE_CONVEX_URL`: Your Convex deployment URL (e.g., `https://your-deployment.convex.cloud`)
   - `VITE_WORKOS_CLIENT_ID`: Your WorkOS Client ID
   - `VITE_WORKOS_REDIRECT_URI`: `https://yourdomain.netlify.app/components/callback`

Create a `netlify.toml` in your project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

The SPA redirect rule ensures all routes serve `index.html` for client-side routing.

## Sign in implementation

Use `signIn()` directly from the AuthKit hook. Do not use `getSignInUrl()` which is deprecated.

```typescript
import { useAuth } from "@workos-inc/authkit-react";

function SignInButton() {
  const { signIn } = useAuth();
  
  return (
    <button
      onClick={() => {
        localStorage.setItem("authReturnPath", window.location.pathname);
        signIn();
      }}
    >
      Sign In
    </button>
  );
}
```

## Sign out implementation

```typescript
import { useAuth } from "@workos-inc/authkit-react";

function SignOutButton() {
  const { signOut } = useAuth();
  
  return (
    <button onClick={() => signOut()}>
      Sign Out
    </button>
  );
}
```

## OAuth callback handling

Handle the callback with proper loading state checks:

```typescript
function AuthCallback() {
  const { isLoading, user, signIn } = useAuth();
  const [authFailed, setAuthFailed] = useState(false);
  const hasAuthCode = useMemo(
    () => new URLSearchParams(window.location.search).has("code"),
    []
  );
  
  const returnPath = useMemo(() => {
    const storedPath = localStorage.getItem("authReturnPath");
    if (storedPath) {
      localStorage.removeItem("authReturnPath");
      return storedPath;
    }
    return "/";
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      window.location.replace(returnPath);
      return;
    }

    if (hasAuthCode) {
      setAuthFailed(true);
      return;
    }

    window.location.replace(returnPath);
  }, [hasAuthCode, isLoading, returnPath, user]);

  return (
    <div>
      {authFailed ? (
        <button onClick={() => signIn()}>Try Again</button>
      ) : (
        <div>Finishing sign in...</div>
      )}
    </div>
  );
}
```

## Checking auth state in components

Use `useConvexAuth()` for auth state (not `useAuth()`) to ensure the Convex backend has validated the token:

```typescript
import { useConvexAuth, Authenticated, Unauthenticated } from "convex/react";

function MyComponent() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <>
      <Authenticated>
        <AuthenticatedContent />
      </Authenticated>
      <Unauthenticated>
        <SignInPrompt />
      </Unauthenticated>
    </>
  );
}
```

## Accessing user identity in Convex functions

```typescript
import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

export const loggedInUser = query({
  args: {},
  returns: v.union(
    v.object({
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      pictureUrl: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return {
      email: identity.email,
      name: identity.name,
      pictureUrl: identity.pictureUrl,
    };
  },
});
```

## Admin access check pattern

Check admin status based on email domain:

```typescript
import { query, QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { v } from "convex/values";

type AuthContext = QueryCtx | MutationCtx | ActionCtx;

export async function requireAdminIdentity(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  const email = identity.email;
  if (!email?.endsWith("@yourdomain.com")) {
    throw new Error("Admin access required");
  }
  return identity;
}

export async function getAdminIdentity(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  const email = identity.email;
  if (!email?.endsWith("@yourdomain.com")) {
    return null;
  }
  return identity;
}

export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }
    const email = identity.email;
    if (!email) {
      return false;
    }
    return email.endsWith("@yourdomain.com");
  },
});
```

## JWT claims configuration

WorkOS JWT templates do not include email by default. Configure in WorkOS Dashboard:

1. Go to WorkOS Dashboard > Authentication > JWT Templates
2. Edit the default template
3. Add required claims:

```json
{
  "email": "{{user.email}}",
  "name": "{{user.first_name}} {{user.last_name}}",
  "picture": "{{user.profile_picture_url}}"
}
```

After configuration, `ctx.auth.getUserIdentity()` returns:

```typescript
{
  tokenIdentifier: "https://api.workos.com/user_management/client_xxx|user_yyy",
  subject: "user_yyy",
  issuer: "https://api.workos.com/user_management/client_xxx",
  email: "user@example.com",
  name: "User Name",
  pictureUrl: "https://..."
}
```

## Production vs development environments

### Different Client IDs

Use environment variables to switch between environments:

```typescript
// convex/auth.config.ts
const clientId = process.env.WORKOS_CLIENT_ID;
```

Set different values in:
- `.env.local` for local development
- `.env.production` for Netlify builds (or Netlify Dashboard environment variables)
- Convex Dashboard for each deployment (dev/prod)

### WorkOS API Key formats

- Development: `sk_test_...`
- Production: `sk_live_...`

### Client ID format

Both environments use: `client_01XXXXXXXXXXXXXXXXXX`

### Netlify vs Local Development URLs

| Environment | Redirect URI | CORS Origin |
|-------------|--------------|-------------|
| Local Dev | `http://localhost:5173/callback` | `http://localhost:5173` |
| Netlify | `https://yourdomain.netlify.app/components/callback` | `https://yourdomain.netlify.app` |
| Custom Domain | `https://yourdomain.com/callback` | `https://yourdomain.com` |

Note: When hosting on Netlify with a `/components` base path, ensure your callback URL includes the full path.

## Checklist for new integration

- [ ] Install `@workos-inc/authkit-react` and `@convex-dev/workos`
- [ ] Set `WORKOS_CLIENT_ID` in Convex dashboard environment variables
- [ ] Set `VITE_WORKOS_CLIENT_ID` in `.env.local`
- [ ] Set `VITE_WORKOS_REDIRECT_URI` in `.env.local`
- [ ] Configure JWT template in WorkOS dashboard with email claim
- [ ] Add redirect URI(s) in WorkOS dashboard (localhost + production)
- [ ] Add CORS origins in WorkOS dashboard
- [ ] Configure both JWT providers in `convex/auth.config.ts`
- [ ] Run `npx convex dev` to sync auth config
- [ ] Handle OAuth callback with proper loading state checks
- [ ] Use `signIn()` directly, not `getSignInUrl()`
- [ ] Test admin access after user logs in with correct email domain

## Checklist for Netlify deployment

- [ ] Create `netlify.toml` with build command and SPA redirect
- [ ] Set environment variables in Netlify Dashboard (VITE_CONVEX_URL, VITE_WORKOS_CLIENT_ID, VITE_WORKOS_REDIRECT_URI)
- [ ] Add Netlify callback URL to WorkOS Redirect URIs
- [ ] Add Netlify origin to WorkOS CORS Origins
- [ ] Test callback flow after deployment

## Source links

- Convex + WorkOS AuthKit: https://docs.convex.dev/auth/authkit/
- WorkOS AuthKit: https://workos.com/docs/authkit
- AuthKit React SDK: https://workos.com/docs/sdks/authkit-react
- WorkOS API Reference: https://workos.com/docs/reference
- Auto provisioning: https://docs.convex.dev/auth/authkit/auto-provision
- Troubleshooting: https://docs.convex.dev/auth/authkit/troubleshooting
- Convex Auth Functions: https://docs.convex.dev/auth/functions-auth
