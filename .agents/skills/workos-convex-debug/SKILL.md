---
name: workos-convex-debug
description: Debug and troubleshoot WorkOS AuthKit authentication issues with Convex. Use when authentication fails, JWT validation errors occur, user identity returns null, email claims are missing, admin access checks fail, or sign in button does not work. Supports Netlify deployment.
---

# WorkOS Convex Debug Skill

> **Always check official docs for the latest information:**
> - Troubleshooting: https://docs.convex.dev/auth/authkit/troubleshooting
> - Convex Debugging Auth: https://docs.convex.dev/auth/debug
> - WorkOS AuthKit: https://workos.com/docs/authkit
> - Netlify Docs: https://docs.netlify.com/

## When to use this skill

Use this skill when you encounter:

- Sign in button does nothing
- User is authenticated but `useConvexAuth()` returns `isAuthenticated: false`
- `ctx.auth.getUserIdentity()` returns `null`
- Email or name fields are undefined in identity
- Admin access check returns false for valid admin users
- JWT validation errors
- OAuth callback redirect issues
- Environment variable configuration problems

## Diagnostic checklist

Run through these checks in order:

### 1. Verify environment variables are set

**Frontend (.env.local):**

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_WORKOS_CLIENT_ID=client_01XXXXXXXXXXXXXXXXXX
VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback
```

**Convex Dashboard:**

- Navigate to Settings > Environment Variables
- Verify `WORKOS_CLIENT_ID` is set

### 2. Verify auth config is deployed

Run `npx convex dev` and look for "Convex functions ready!" message.

If you see an error about `WORKOS_CLIENT_ID`:
1. Follow the link in the error message
2. Paste your WorkOS Client ID
3. Save and wait for deployment

### 3. Check WorkOS Dashboard configuration

**Redirect URIs:**
- Must include `http://localhost:5173/callback` for local dev
- Must include production callback URL

**CORS Origins:**
- Must include `http://localhost:5173` for local dev
- Must include production origin

**JWT Template:**
- Must include `email` claim (see Problem 2 below)

## Common problems and solutions

### Problem 1: Sign in button does nothing

**Symptom:** Clicking Sign In has no effect. No redirect to WorkOS.

**Root cause:** Using deprecated `getSignInUrl()` or incorrect event handler.

**Solution:** Use `signIn()` directly from the AuthKit hook:

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

**Do not use:**
- `getSignInUrl()` (deprecated)
- Manual URL construction
- Direct navigation to WorkOS URLs

### Problem 2: Email is undefined in identity

**Symptom:** `ctx.auth.getUserIdentity()` returns user but `identity.email` is undefined.

**Root cause:** WorkOS JWT templates do not include email claim by default.

**Solution:** Configure JWT template in WorkOS Dashboard:

1. Go to WorkOS Dashboard > Authentication > JWT Templates
2. Edit the default template
3. Add claims:

```json
{
  "email": "{{user.email}}",
  "name": "{{user.first_name}} {{user.last_name}}",
  "picture": "{{user.profile_picture_url}}"
}
```

4. Save and redeploy

**Verification:** After fix, identity should include:

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

### Problem 3: JWT validation fails intermittently

**Symptom:** Authentication works for some users but not others. "Invalid token" errors.

**Root cause:** Only one JWT provider configured. WorkOS issues JWTs from two issuers:
1. SSO: `https://api.workos.com/`
2. User Management: `https://api.workos.com/user_management/{clientId}`

**Solution:** Configure both providers in `convex/auth.config.ts`:

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

Run `npx convex dev` after changing this file.

### Problem 4: Callback redirects before auth completes

**Symptom:** After login, user lands on page showing "not authenticated" briefly.

**Root cause:** Callback component redirects before AuthKit finishes token exchange.

**Solution:** Wait for AuthKit loading state:

```typescript
function AuthCallback() {
  const { isLoading, user, signIn } = useAuth();
  const [authFailed, setAuthFailed] = useState(false);
  const hasAuthCode = useMemo(
    () => new URLSearchParams(window.location.search).has("code"),
    []
  );

  useEffect(() => {
    // Wait for AuthKit to finish
    if (isLoading) {
      return;
    }

    // Only redirect after session established
    if (user) {
      window.location.replace(returnPath);
      return;
    }

    // Auth code present but no user = exchange failed
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

### Problem 5: useConvexAuth returns false after login

**Symptom:** User successfully logs in via WorkOS, but `useConvexAuth()` returns `isAuthenticated: false`.

**Root cause:** Backend not correctly configured to validate tokens.

**Diagnostic steps:**

1. Check `convex/auth.config.ts` exists and has both providers
2. Verify `WORKOS_CLIENT_ID` is set in Convex Dashboard
3. Run `npx convex dev` to deploy config
4. Check browser console for JWT validation errors

**Common causes:**
- Missing `WORKOS_CLIENT_ID` environment variable
- Only one JWT provider configured
- Auth config not deployed after changes

### Problem 6: Admin check returns false for valid admin

**Symptom:** User with `@yourdomain.com` email shows as non-admin.

**Root cause:** Usually Problem 2 (email not in JWT claims).

**Debugging:**

```typescript
// Add logging in your admin check
export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log("Identity:", JSON.stringify(identity, null, 2));
    
    if (!identity) {
      console.log("No identity");
      return false;
    }
    
    const email = identity.email;
    console.log("Email:", email);
    
    if (!email) {
      console.log("No email in identity");
      return false;
    }
    
    return email.endsWith("@yourdomain.com");
  },
});
```

Check Convex Dashboard Logs for output.

### Problem 7: Platform not authorized error

**Symptom:**

```
WorkOSPlatformNotAuthorized: Your WorkOS platform API key is not authorized 
to access this team.
```

**Root cause:** WorkOS workspace has been disconnected from Convex.

**Solution:** Reconnect or create new workspace:

```bash
npx convex integration workos disconnect-team
npx convex integration workos provision-team
```

Note: You may need a different email for the new WorkOS workspace.

### Problem 8: Missing aud claim error

**Symptom:** Token validation fails with audience claim error.

**Root cause:** WorkOS JWTs may not include `aud` (audience) claim by default.

**Solution:** Check WorkOS Dashboard JWT configuration:
- Ensure audience claim is set to your Client ID
- Or configure Convex to not require audience validation

## Debug logging

### Frontend logging

```typescript
function DebugAuth() {
  const { user, isLoading } = useAuth();
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  
  console.log("AuthKit state:", { user, isLoading });
  console.log("Convex state:", { isAuthenticated, convexLoading });
  
  return null;
}
```

### Backend logging

```typescript
export const debugIdentity = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log("Full identity:", JSON.stringify(identity, null, 2));
    return identity;
  },
});
```

View logs in Convex Dashboard > Logs.

## Environment variable troubleshooting

### Verify Vite picks up env vars

```typescript
// In your app, temporarily add:
console.log("VITE_WORKOS_CLIENT_ID:", import.meta.env.VITE_WORKOS_CLIENT_ID);
console.log("VITE_WORKOS_REDIRECT_URI:", import.meta.env.VITE_WORKOS_REDIRECT_URI);
```

If undefined:
1. Ensure variables start with `VITE_`
2. Restart dev server after changing `.env.local`
3. Verify `.env.local` is in project root

### Verify Convex picks up env vars

Check Convex Dashboard > Settings > Environment Variables

If `WORKOS_CLIENT_ID` shows error in logs:
1. Click the link in the error
2. Set the value
3. Wait for redeployment

## Production vs development

### Different callback URLs

**Development:**
```
VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback
```

**Netlify Production:**
```
VITE_WORKOS_REDIRECT_URI=https://yourdomain.netlify.app/components/callback
```

**Custom Domain Production:**
```
VITE_WORKOS_REDIRECT_URI=https://yourdomain.com/callback
```

All callback URLs must be added to WorkOS Dashboard > Redirect URIs.

### Different CORS origins

Add all to WorkOS Dashboard > Sessions > CORS:
- `http://localhost:5173`
- `https://yourdomain.netlify.app`
- `https://yourdomain.com` (if using custom domain)

### Different Convex deployments

Set `WORKOS_CLIENT_ID` separately for:
- Development deployment
- Production deployment

### Netlify specific issues

**MIME type error on Netlify:**

If you see `Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html"`:

1. Ensure `netlify.toml` exists with SPA redirect:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. Ensure `vite.config.ts` uses `base: "/"` for Netlify hosting
3. Clear Netlify cache and redeploy

**Callback not working on Netlify:**

1. Verify redirect URI in `.env.production` matches what's in WorkOS Dashboard
2. Ensure the callback path includes any base path (e.g., `/components/callback`)
3. Check Netlify Functions logs for any errors

## Quick fixes reference

| Symptom | Quick fix |
|---------|-----------|
| Sign in does nothing | Use `signIn()` not `getSignInUrl()` |
| Email undefined | Configure JWT template in WorkOS |
| Intermittent failures | Add both JWT providers |
| Callback timing | Wait for `isLoading` to be false |
| Admin check fails | Check email claim in JWT template |
| Platform error | Reconnect WorkOS workspace |

## When to escalate

If none of these solutions work:

1. Check Convex Discord for similar issues
2. Check WorkOS documentation updates
3. Review recent changes to auth config
4. Test with minimal reproduction

## Source links

- Troubleshooting guide: https://docs.convex.dev/auth/authkit/troubleshooting
- Convex debugging auth: https://docs.convex.dev/auth/debug
- WorkOS JWT templates: https://workos.com/docs/authentication/jwt-templates
- Convex auth functions: https://docs.convex.dev/auth/functions-auth
- WorkOS API reference: https://workos.com/docs/reference
