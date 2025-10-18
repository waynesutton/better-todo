# WorkOS AuthKit Integration - Complete Implementation Guide

## Overview

This document provides a comprehensive guide for implementing WorkOS AuthKit with Convex authentication in a React application. Based on our successful implementation, this guide covers what worked, what didn't, and the critical steps needed to get everything functioning properly.

## What We Built

A complete authentication system that:

- Enables user login/logout with WorkOS AuthKit
- Provides private user data (each user sees only their own todos and notes)
- Uses theme-aware login/user icons
- Shows "Sign In Required" modal for unauthenticated users
- Automatically stores user data in Convex database
- Handles JWT token validation with proper configuration
- Manages redirects and authentication state

## Critical Success Factors

### 1. JWT Configuration is Everything

The most critical aspect of the integration is the JWT token configuration in WorkOS Dashboard. Without proper `aud` (audience) claim, Convex will reject all authentication attempts.

**Required JWT Template in WorkOS Dashboard:**

```json
{
  "aud": "client_01XXXXXXXXXXXXXXXXXXXXXXXX",
  "email": "{{ user.email }}",
  "name": "{{ user.first_name }} {{ user.last_name }}"
}
```

**Key Points:**

- `aud` must match your WorkOS Client ID exactly
- **Do NOT include `iss` claim** - WorkOS automatically sets this
- **Do NOT include `sub` claim** - WorkOS automatically sets this
- Replace `client_01XXXXXXXXXXXXXXXXXXXXXXXX` with your actual client ID
- Use WorkOS template syntax: `{{ user.email }}` and `{{ user.first_name }} {{ user.last_name }}`
- The `sub` field is automatically set by WorkOS and becomes the user ID in Convex (`identity.subject`)

### 2. Environment Variables Setup

**Frontend (.env.local):**

```env
# Convex
VITE_CONVEX_URL=https://your-deployment.convex.cloud

# WorkOS AuthKit
VITE_WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXXXXXXXX
VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback
```

**Backend (Convex Dashboard):**

```env
WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXXXXXXXX
```

**Important:** Use `VITE_` prefix for frontend variables, no prefix for backend variables.

### 3. Convex Auth Configuration

**convex/auth.config.ts:**

```typescript
const clientId = process.env.WORKOS_CLIENT_ID;

const authConfig = {
  providers: [
    // WorkOS AuthKit JWT
    {
      type: "customJwt" as const,
      issuer: `https://api.workos.com/`,
      algorithm: "RS256" as const,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
  ],
};

export default authConfig;
```

### 4. Frontend Provider Setup

**src/main.tsx:**

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import "./index.css";
import App from "./App.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
      redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
    >
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  </StrictMode>,
);
```

### 5. User Data Storage

**convex/schema.ts:**

```typescript
users: defineTable({
  userId: v.string(), // WorkOS user ID (from auth subject)
  email: v.string(),
  firstName: v.string(),
  lastName: v.string(),
})
  .index("by_userId", ["userId"]),
```

**convex/users.ts:**

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store or update user info from WorkOS
export const storeUser = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
      });
    } else {
      // Create new user
      await ctx.db.insert("users", {
        userId: args.userId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
      });
    }
    return null;
  },
});

// Get current authenticated user info
export const getCurrentUser = query({
  args: {},
  returns: v.object({
    userId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found in database");
    }

    return {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  },
});
```

### 6. Authentication State Management

**src/App.tsx:**

```typescript
import { useConvexAuth } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useAuth();
  const storeUser = useMutation(api.users.storeUser);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Store user data when authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      storeUser({
        userId: user.id,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
    }
  }, [user, isAuthenticated, storeUser]);

  // Handle redirect from /callback
  useEffect(() => {
    if (window.location.pathname === "/callback" && isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  // Show auth modal for unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasShownModal) {
      setShowAuthModal(true);
      setHasShownModal(true);
    }
  }, [isLoading, isAuthenticated]);

  // Conditional query execution
  const availableDates = useQuery(
    api.todos.getAvailableDates,
    isAuthenticated ? undefined : "skip",
  );

  // ... rest of component
}
```

### 7. Conditional Query Execution

All Convex queries must be conditionally executed based on authentication state:

```typescript
// ✅ Correct - Skip when unauthenticated
const todos = useQuery(
  api.todos.getTodosByDate,
  isAuthenticated ? { date: selectedDate } : "skip",
);

// ❌ Wrong - Will cause "Not authenticated" errors
const todos = useQuery(api.todos.getTodosByDate, { date: selectedDate });
```

### 8. Authentication UI Components

**Login/Logout Button in Sidebar:**

```typescript
import { useConvexAuth } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";

export function Sidebar() {
  const { isAuthenticated } = useConvexAuth();
  const { user, signIn, signOut } = useAuth();
  const { theme } = useTheme();

  const showAsAuthenticated = isAuthenticated || !!user;

  return (
    <div className="sidebar-footer">
      {showAsAuthenticated && user ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="login-button"
              onClick={async () => {
                try {
                  await signOut();
                  window.location.href = "/"; // Reload to clear state
                } catch (error) {
                  console.error("Sign out error:", error);
                }
              }}
            >
              <img
                src={theme === "dark" ? "/user-light.svg" : "/user-dark.svg"}
                alt="User profile"
                width="18"
                height="18"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {user.firstName || user.email} - Click to sign out
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="login-button" onClick={() => signIn()}>
              <img
                src={theme === "dark" ? "/login-light.svg" : "/login-dark.svg"}
                alt="Sign in"
                width="18"
                height="18"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Sign in to your account
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
```

**Sign In Required Modal:**

```typescript
<ConfirmDialog
  isOpen={showAuthModal}
  title="Sign In Required"
  message="Please sign in to create todos and notes. Your data will be private and secure."
  confirmText="Sign In"
  cancelText="Cancel"
  onConfirm={() => {
    setShowAuthModal(false);
    signIn();
  }}
  onCancel={() => setShowAuthModal(false)}
  isDangerous={false}
/>
```

## Common Issues and Solutions

### Issue 1: "Not authenticated" errors

**Symptoms:** All Convex mutations/queries fail with "Not authenticated" error

**Solutions:**

1. Check JWT configuration in WorkOS Dashboard
2. Verify `aud` claim matches your client ID exactly
3. **Do NOT include `iss` or `sub` claims** - WorkOS sets these automatically
4. Check environment variables are set correctly
5. Use conditional query execution (`isAuthenticated ? args : "skip"`)

### Issue 2: Token not being stored

**Symptoms:** WorkOS login succeeds but Convex `isAuthenticated` remains false

**Solutions:**

1. Verify JWT template is saved in WorkOS Dashboard
2. Check browser Network tab for failed token exchange requests
3. Ensure CORS settings include your domain
4. Verify redirect URI matches exactly

### Issue 3: Redirect loop

**Symptoms:** App redirects to `/callback` but never returns to `/`

**Solutions:**

1. Add redirect handling in App.tsx
2. Check redirect URI configuration in WorkOS Dashboard
3. Verify CORS settings

### Issue 4: User data not persisting

**Symptoms:** User data disappears after refresh

**Solutions:**

1. Implement `storeUser` mutation
2. Call `storeUser` when user authenticates
3. Check user table exists in schema
4. Verify user ID mapping (`identity.subject` → `userId`)

## Step-by-Step Setup Guide

### 1. Install Dependencies

```bash
npm install @workos-inc/authkit-react @convex-dev/workos
```

### 2. Set up WorkOS Dashboard

1. Sign up at [workos.com](https://workos.com/sign-up)
2. Navigate to **Authentication** → **AuthKit**
3. Click **Set up AuthKit**
4. Select **Use AuthKit's customizable hosted UI**
5. Add redirect URIs:
   - Development: `http://localhost:5173/callback`
   - Production: `https://your-domain.com/callback`
6. Add CORS origins:
   - Development: `http://localhost:5173`
   - Production: `https://your-domain.com`
7. Copy your Client ID

### 3. Configure JWT Template

In WorkOS Dashboard, go to **JWT Templates** and create:

```json
{
  "aud": "YOUR_CLIENT_ID_HERE",
  "email": "{{ user.email }}",
  "name": "{{ user.first_name }} {{ user.last_name }}"
}
```

**Critical:**

- Replace `YOUR_CLIENT_ID_HERE` with your actual client ID
- **Do NOT include `iss` or `sub` claims** - WorkOS automatically sets these
- Use WorkOS template syntax with `{{ }}` for user data

### 4. Set Environment Variables

**Create `.env.local`:**

```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXXXXXXXX
VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback
```

**Set in Convex Dashboard:**

```env
WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXXXXXXXX
```

### 5. Create Convex Auth Configuration

Create `convex/auth.config.ts` with the simplified configuration shown above (single provider with `https://api.workos.com/` issuer).

### 6. Update Frontend Providers

Update `src/main.tsx` with the provider setup shown above.

### 7. Implement Authentication Logic

Add authentication state management to `src/App.tsx` as shown above.

### 8. Update All Convex Functions

Replace hardcoded `userId = "anonymous"` with:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Not authenticated");
}
const userId = identity.subject;
```

### 9. Add User Data Storage

Create `convex/users.ts` and `convex/schema.ts` updates as shown above.

### 10. Test Authentication Flow

1. Start development server: `npm run dev`
2. Click login button in sidebar
3. Complete WorkOS authentication
4. Verify user data is stored
5. Test creating todos/notes
6. Test logout/login cycle

## Production Deployment

### Netlify Configuration

1. Set environment variables in Netlify dashboard:
   - `VITE_CONVEX_URL`
   - `VITE_WORKOS_CLIENT_ID`
   - `VITE_WORKOS_REDIRECT_URI=https://your-domain.netlify.app/callback`

2. Update WorkOS Dashboard:
   - Add production redirect URI
   - Add production CORS origin
   - Update JWT template if needed

3. Deploy Convex backend:

   ```bash
   npx convex deploy
   ```

4. Set production environment variables in Convex dashboard

### Domain Configuration

Update all references to `localhost:5173` with your production domain:

- WorkOS redirect URIs
- WorkOS CORS origins
- Environment variables
- JWT template (if using domain-specific claims)

## Security Considerations

1. **Never expose API keys** - Use environment variables
2. **Validate JWT tokens** - Convex handles this automatically
3. **Use HTTPS in production** - Required for WorkOS
4. **Implement proper CORS** - Restrict to your domains only
5. **Store user data securely** - Convex provides secure storage
6. **Handle authentication errors** - Provide fallback UI

## Troubleshooting Checklist

- [ ] JWT template saved in WorkOS Dashboard
- [ ] `aud` claim matches client ID exactly
- [ ] **No `iss` or `sub` claims** in JWT template (WorkOS sets these automatically)
- [ ] Environment variables set correctly
- [ ] CORS origins include your domain
- [ ] Redirect URIs match exactly
- [ ] Convex auth.config.ts deployed with single provider
- [ ] Frontend providers configured
- [ ] Conditional query execution implemented
- [ ] User data storage working
- [ ] Authentication state management working

## References

- [WorkOS AuthKit Documentation](https://docs.convex.dev/auth/authkit/)
- [Convex Authentication Guide](https://docs.convex.dev/auth/functions-auth)
- [WorkOS Dashboard](https://dashboard.workos.com/)
- [Convex Dashboard](https://dashboard.convex.dev/)
- [WorkOS JWT Templates Documentation](https://workos.com/docs/authkit/jwt-templates)

## Conclusion

WorkOS AuthKit integration with Convex requires careful attention to JWT configuration, environment variables, and authentication state management. The most common issues stem from incorrect JWT claims or missing environment variables. Follow this guide step-by-step, and you'll have a working authentication system that provides secure, private user data.

The key to success is understanding that WorkOS handles the authentication flow and automatically sets the `iss` and `sub` claims, but Convex needs properly configured JWT tokens with the correct `aud` claim to validate and authorize users. Once both systems are configured correctly, the integration provides a seamless, secure authentication experience.

**Important:** According to the [WorkOS JWT Templates documentation](https://workos.com/docs/authkit/jwt-templates), the `iss`, `sub`, `exp`, `iat`, `nbf`, and `jti` keys are reserved and cannot be used in templates. WorkOS automatically sets these claims, so you should only include custom claims like `aud`, `email`, and `name` in your JWT template.
