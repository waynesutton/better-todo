# AI Models Configuration

This document lists all AI model configurations in the codebase and where to change them.

## Current Models

| Provider  | Model                      | Used In              |
| --------- | -------------------------- | -------------------- |
| Anthropic | `claude-sonnet-4-20250514` | AI Chat, Agent Tasks |
| OpenAI    | `gpt-5-mini`               | AI Chat              |
| OpenAI    | `gpt-5.2`                  | Agent Tasks          |

## AI Chat

File: [convex/aiChatActions.ts](../convex/aiChatActions.ts)

| Provider | Line | Function           |
| -------- | ---- | ------------------ |
| Claude   | 204  | `generateResponse` |
| OpenAI   | 242  | `generateResponse` |

### Claude (Line 204)

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514", // <-- Change here
  max_tokens: 2048,
  system: systemPrompt,
  messages: claudeMessages,
});
```

### OpenAI (Line 258)

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-5-mini", // <-- Change here
  max_completion_tokens: 2048,
  messages: openaiMessages,
});
```

## Agent Tasks

File: [convex/agentTaskActions.ts](../convex/agentTaskActions.ts)

| Provider | Line | Function                        |
| -------- | ---- | ------------------------------- |
| Claude   | 254  | `processWithClaude`             |
| Claude   | 283  | `processWithClaudeConversation` |
| OpenAI   | 307  | `processWithOpenAI`             |
| OpenAI   | 338  | `processWithOpenAIConversation` |
| Claude   | 522  | `runClaudeAgentLoop`            |
| OpenAI   | 636  | `runOpenAIAgentLoop`            |

### processWithClaude (Line 254)

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514", // <-- Change here
  max_tokens: 4096,
  system: systemPrompt,
  messages,
});
```

### processWithClaudeConversation (Line 283)

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514", // <-- Change here
  max_tokens: 4096,
  system: systemPrompt,
  messages,
});
```

### processWithOpenAI (Line 327)

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-5.2",  // <-- Change here
  max_completion_tokens: 4096,
  messages: [...],
});
```

### processWithOpenAIConversation (Line 358)

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-5.2",  // <-- Change here
  max_completion_tokens: 4096,
  messages: [...],
});
```

### runClaudeAgentLoop (Line 522)

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514", // <-- Change here
  max_tokens: 4096,
  system: systemPrompt,
  tools,
  messages: conversationHistory,
});
```

### runOpenAIAgentLoop (Line 664)

```typescript
const response = await openai.chat.completions.create({
  model: "gpt-5.2",  // <-- Change here
  max_completion_tokens: 4096,
  tools,
  messages: [...],
});
```

## Available Models

### Anthropic (Claude)

| Model                        | Description                 |
| ---------------------------- | --------------------------- |
| `claude-sonnet-4-20250514`   | Latest Sonnet, best balance |
| `claude-3-5-sonnet-20241022` | Previous Sonnet             |
| `claude-3-opus-20240229`     | Most capable, slower        |
| `claude-3-haiku-20240307`    | Fastest, cheapest           |

### OpenAI

| Model         | Description               |
| ------------- | ------------------------- |
| `gpt-5.2`     | Latest, most capable      |
| `gpt-5.2-pro` | Pro tier, highest quality |
| `gpt-5-mini`  | Fast, cost effective      |
| `gpt-5-nano`  | Fastest, cheapest         |
| `o1`          | Reasoning model           |
| `o1-mini`     | Smaller reasoning model   |

## System Prompts

### AI Chat

Uses environment variables (set in Convex Dashboard):

- `CLAUDE_PROMPT_STYLE`
- `CLAUDE_PROMPT_COMMUNITY`
- `CLAUDE_PROMPT_RULES`

Built in [convex/aiChatActions.ts](../convex/aiChatActions.ts) lines 17-31.

### Agent Tasks

Uses `EXECUTABLE_NOTE_SYSTEM_PROMPT` defined in [convex/agentTools.ts](../convex/agentTools.ts).
