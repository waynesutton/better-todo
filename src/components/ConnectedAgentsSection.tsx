import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, ChevronRight, Copy, Plug, Trash2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { ConfirmDialog } from "./ConfirmDialog";

// MCP server URL: the deployment's .site origin plus /mcp
const MCP_URL = `${(import.meta.env.VITE_CONVEX_URL as string).replace(
  /\.cloud\/?$/,
  ".site",
)}/mcp`;

// Setup prompt for Grok Bot. Never contains the key: the Bot must collect it
// through a masked secret request, since its computer is shared by every Bot
const GROK_SETUP_PROMPT = `Connect my better todo account as a custom MCP connector.

Server URL: ${MCP_URL}
Transport: Streamable HTTP
Auth header: Authorization: Bearer <my better todo API key>

I created the API key in better todo under Settings > Connected Agents. Do not ask me to paste it in this chat. Ask for it with a secure secret request so it stays masked and out of the conversation. If you can't open a secure secret request, stop and tell me exactly where to enter it myself in the connector settings.

Never write the key to files, notes, memory, skills, or the terminal, and never repeat it back to me.

Once connected, call list_today to confirm it works and show me what's on my list today. Use the better todo tools for my todos, notes, and projects, and ask me before replacing the content of a note.`;

// "just now", "5m ago", "3h ago", "2d ago"
function timeAgo(ms: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

function scopeSummary(scopes: Array<string>): string {
  const canWrite = scopes.some((s) => s.endsWith(":write"));
  return canWrite ? "Read and write" : "Read only";
}

// Copy button that flips to a check for a moment
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="api-key-pause-btn"
      aria-label={label}
      title={label}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// Settings section: MCP URL, API keys, connected agents and their activity
export function ConnectedAgentsSection() {
  const connections = useQuery(api.mcp.listConnections);
  const activity = useQuery(api.mcpActivity.listMyAgentActivity);
  const createApiKey = useAction(api.mcp.createApiKey);
  const revokeConnection = useMutation(api.mcp.revokeConnection);

  const [keyName, setKeyName] = useState("Grok Bot");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ name: string; apiKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<{ id: string; name: string } | null>(
    null,
  );

  // Activity rows show the agent's name via its connection
  const connectionNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const connection of connections ?? []) {
      names.set(connection.id, connection.name);
    }
    return names;
  }, [connections]);

  const handleCreate = async () => {
    const name = keyName.trim() || "AI agent";
    setCreating(true);
    setError(null);
    try {
      const result = await createApiKey({ name });
      setNewKey({ name, apiKey: result.apiKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!pendingRevoke) return;
    const { id } = pendingRevoke;
    setPendingRevoke(null);
    try {
      await revokeConnection({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect the agent");
    }
  };

  return (
    <div className="keyboard-shortcuts-category api-keys-section">
      <h3>
        <Plug size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
        Connected Agents
      </h3>
      <p className="keyboard-shortcuts-code-info">
        Let Grok Bot, Claude, Cursor or any MCP agent read and update your todos,
        notes and projects. Each agent acts only as you, and you can disconnect it
        anytime.
      </p>

      {error && <div className="api-key-error">{error}</div>}

      {/* Server URL */}
      <div className="api-key-field">
        <div className="api-key-label">
          <span>MCP server URL</span>
        </div>
        <div className="api-key-saved-row">
          <code className="api-key-masked agents-url">{MCP_URL}</code>
          <CopyButton value={MCP_URL} label="Copy MCP server URL" />
        </div>
        <p className="agents-hint">
          Claude and Cursor: paste this URL and approve the agent when asked. Grok
          Bot and CLI agents: add it with an API key as a Bearer token.
        </p>
      </div>

      {/* API keys */}
      <div className="api-key-field">
        <div className="api-key-label">
          <span>API key</span>
        </div>
        {newKey ? (
          <div className="agents-new-key">
            <div className="api-key-saved-row">
              <code className="api-key-masked agents-url">{newKey.apiKey}</code>
              <CopyButton value={newKey.apiKey} label="Copy API key" />
            </div>
            <p className="agents-hint">
              Copy this key for {newKey.name} now. It won't be shown again.
            </p>
            <button
              type="button"
              className="api-key-save-btn"
              onClick={() => setNewKey(null)}
            >
              Done
            </button>
          </div>
        ) : (
          <form
            className="api-key-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreate();
            }}
          >
            <div className="api-key-input-wrapper">
              <input
                className="api-key-input agents-name-input"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                maxLength={60}
                aria-label="Agent name"
                placeholder="Agent name"
                autoComplete="off"
              />
            </div>
            <button type="submit" className="api-key-save-btn" disabled={creating}>
              {creating ? "Creating..." : "Create key"}
            </button>
          </form>
        )}

        {/* Copyable Grok Bot setup prompt, collapsed by default */}
        <details className="agents-prompt">
          <summary className="agents-prompt-summary">
            <ChevronRight size={14} className="agents-prompt-chevron" aria-hidden="true" />
            Grok Bot setup prompt
          </summary>
          <div className="agents-prompt-body">
            <div className="agents-prompt-header">
              <span className="agents-hint agents-prompt-note">
                Paste this into Grok Bot. It has no key in it. Grok Bot will ask for
                your key in a masked field.
              </span>
              <CopyButton value={GROK_SETUP_PROMPT} label="Copy Grok Bot setup prompt" />
            </div>
            <pre className="agents-prompt-text">{GROK_SETUP_PROMPT}</pre>
          </div>
        </details>
      </div>

      {/* Connected agents */}
      <div className="api-key-field">
        <div className="api-key-label">
          <span>Connected</span>
        </div>
        {connections === undefined ? (
          <p className="agents-hint">Loading...</p>
        ) : connections.length === 0 ? (
          <p className="agents-hint">No agents connected yet.</p>
        ) : (
          <ul className="agents-list">
            {connections.map((connection) => (
              <li key={connection.id} className="agents-row">
                <div className="agents-row-main">
                  <span className="agents-row-title">{connection.name}</span>
                  <span className="agents-row-meta">
                    {connection.kind === "apiKey" ? "API key" : "Signed in"} ·{" "}
                    {scopeSummary(connection.scopes)} ·{" "}
                    {connection.lastUsedAt
                      ? `used ${timeAgo(connection.lastUsedAt)}`
                      : "never used"}
                  </span>
                </div>
                <button
                  type="button"
                  className="api-key-delete-btn"
                  aria-label={`Disconnect ${connection.name}`}
                  title="Disconnect"
                  onClick={() =>
                    setPendingRevoke({ id: connection.id, name: connection.name })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent activity */}
      <div className="api-key-field">
        <div className="api-key-label">
          <span>Recent agent activity</span>
        </div>
        {activity === undefined ? (
          <p className="agents-hint">Loading...</p>
        ) : activity.length === 0 ? (
          <p className="agents-hint">No agent activity yet.</p>
        ) : (
          <ul className="agents-list">
            {activity.map((row) => (
              <li key={row._id} className="agents-row">
                <div className="agents-row-main">
                  <span className="agents-row-title">{row.summary}</span>
                  <span className="agents-row-meta">
                    {connectionNames.get(row.connectionId) ?? "Disconnected agent"} ·{" "}
                    {timeAgo(row.createdAt)}
                    {row.targetDate ? ` · ${row.targetDate}` : ""}
                  </span>
                </div>
                {row.matched && (
                  <span
                    className="agents-matched-tag"
                    title="The agent described this item loosely and smart matching picked it"
                  >
                    matched
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="agents-hint">
        When an agent describes an item loosely, short todo, note and project titles
        may be sent to TypeSafe to pick the right one. Nothing else leaves better todo.
      </p>

      <ConfirmDialog
        isOpen={pendingRevoke !== null}
        title="Disconnect agent?"
        message={`${pendingRevoke?.name ?? "This agent"} will lose access right away. You can connect it again later.`}
        confirmText="Disconnect"
        onConfirm={() => void handleRevoke()}
        onCancel={() => setPendingRevoke(null)}
        isDangerous
      />
    </div>
  );
}
