import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { SignIn } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "../context/ThemeContext";

// Text colors per theme for the Clerk sign in card
const clerkColors = {
  dark: { primary: "#ffffff", background: "#2E3842" },
  light: { primary: "#000000", background: "#ffffff" },
  tan: { primary: "#1a1a1a", background: "#faf8f5" },
  cloud: { primary: "#171717", background: "#ededed" },
} as const;

// Consent page for connecting an AI agent (MCP). Agents send users here as
// /connect?request=<id>; device flow agents may also show a code to type in.
export function Connect() {
  const { theme } = useTheme();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("request");

  // Never render approval UI inside another site's frame (clickjacking)
  if (window.top !== window.self) {
    return (
      <ConnectShell>
        <h1 className="connect-title">Open this page directly</h1>
        <p className="connect-text">
          For your safety, agent approvals can't be shown inside another site.
        </p>
      </ConnectShell>
    );
  }

  if (isLoading) {
    return (
      <ConnectShell>
        <p className="connect-text">Loading...</p>
      </ConnectShell>
    );
  }

  if (!isAuthenticated) {
    const colors = clerkColors[theme];
    return (
      <ConnectShell>
        <h1 className="connect-title">Sign in to connect your agent</h1>
        <p className="connect-text">
          An AI agent wants to use your better todo. Sign in to review the request.
        </p>
        <div className="connect-signin">
          <SignIn
            routing="hash"
            forceRedirectUrl={window.location.href}
            appearance={{
              variables: {
                colorPrimary: colors.primary,
                colorBackground: colors.background,
                colorText: colors.primary,
                borderRadius: "4px",
              },
            }}
          />
        </div>
      </ConnectShell>
    );
  }

  return (
    <ConnectShell>
      {requestId ? <ConsentRequest requestId={requestId} /> : <CodeEntry />}
    </ConnectShell>
  );
}

function ConnectShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="connect-page">
      <div className="connect-card">
        <Link to="/" className="connect-brand">
          better todo
        </Link>
        {children}
      </div>
    </main>
  );
}

// Device flow without a link: the user types the code their agent shows
function CodeEntry() {
  const findAuthRequest = useMutation(api.mcp.findAuthRequest);
  const [, setSearchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await findAuthRequest({ userCode: code.trim() });
      if (id) {
        setSearchParams({ request: id });
      } else {
        setError("That code didn't match a pending request. Check your agent and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not look up that code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="connect-title">Connect an agent</h1>
      <p className="connect-text">Enter the code your AI agent is showing you.</p>
      <form className="connect-code-form" onSubmit={handleSubmit}>
        <input
          className="connect-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD-EFGH"
          aria-label="Agent code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          autoFocus
        />
        <button className="connect-btn connect-btn-primary" type="submit" disabled={busy}>
          {busy ? "Checking..." : "Continue"}
        </button>
      </form>
      {error && <p className="connect-error">{error}</p>}
    </>
  );
}

function ConsentRequest({ requestId }: { requestId: string }) {
  const request = useQuery(api.mcp.getAuthRequest, { requestId });
  const authorize = useAction(api.mcp.authorize);
  const [codeConfirmed, setCodeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"approved" | "denied" | null>(null);

  if (request === undefined) {
    return <p className="connect-text">Loading request...</p>;
  }

  if (request === null) {
    return (
      <>
        <h1 className="connect-title">Request not found</h1>
        <p className="connect-text">
          This request expired or was already used. Start the connection again from
          your agent.
        </p>
      </>
    );
  }

  const isDevice = request.kind === "device";
  const finalStatus = outcome ?? (request.status !== "pending" ? request.status : null);

  if (finalStatus) {
    return (
      <>
        <h1 className="connect-title">
          {finalStatus === "approved" ? "Agent connected" : "Request denied"}
        </h1>
        <p className="connect-text">
          {finalStatus === "approved"
            ? "You can go back to your agent now. Manage or disconnect it anytime in Settings."
            : "The agent was not given access. You can close this page."}
        </p>
        <Link to="/" className="connect-btn connect-btn-secondary">
          Back to better todo
        </Link>
      </>
    );
  }

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = await authorize({
        requestId,
        approve,
        ...(isDevice && approve && request.userCode ? { userCode: request.userCode } : {}),
      });
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      setOutcome(approve ? "approved" : "denied");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete the request");
    } finally {
      setBusy(false);
    }
  };

  const agentName = request.clientName?.trim() || "An AI agent";
  // Where approval sends the browser, so a look-alike agent can't hide it
  let redirectHost: string | null = null;
  if (!isDevice && request.redirectUri) {
    try {
      redirectHost = new URL(request.redirectUri).host || request.redirectUri;
    } catch {
      redirectHost = request.redirectUri;
    }
  }

  return (
    <>
      <h1 className="connect-title">{agentName} wants access to your better todo</h1>
      <p className="connect-unverified">
        The agent reported this name itself. Only continue if you started this
        connection.
      </p>

      <p className="connect-label">It will be able to</p>
      <ul className="connect-scopes">
        {request.scopes.map((scope) => (
          <li key={scope.name}>{scope.description}</li>
        ))}
      </ul>
      <p className="connect-text connect-small">
        It acts only as you. There are no delete tools, and you can disconnect it
        anytime in Settings.
      </p>
      {redirectHost && (
        <p className="connect-text connect-small">
          After you choose, you'll return to <strong>{redirectHost}</strong>.
        </p>
      )}

      {isDevice && request.userCode && (
        <div className="connect-device">
          <p className="connect-label">Your agent should be showing this code</p>
          <div className="connect-user-code">{request.userCode}</div>
          <label className="connect-confirm">
            <input
              type="checkbox"
              checked={codeConfirmed}
              onChange={(e) => setCodeConfirmed(e.target.checked)}
            />
            This code matches the one my agent shows
          </label>
        </div>
      )}

      {error && <p className="connect-error">{error}</p>}

      <div className="connect-actions">
        <button
          type="button"
          className="connect-btn connect-btn-secondary"
          onClick={() => void decide(false)}
          disabled={busy}
        >
          Deny
        </button>
        <button
          type="button"
          className="connect-btn connect-btn-primary"
          onClick={() => void decide(true)}
          disabled={busy || (isDevice && !codeConfirmed)}
        >
          {busy ? "Working..." : "Allow"}
        </button>
      </div>
    </>
  );
}
