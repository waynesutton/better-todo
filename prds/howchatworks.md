# How the Chat feature works

The Chat feature provides AI writing assistance for each date in your todo list. It uses Claude to help with tweets, blog posts, documentation, and any writing task.

## Architecture

### Frontend

The chat UI lives in `src/components/AIChatView.tsx`. It renders:

- A message history area showing user and AI responses
- An auto-expanding textarea for input
- Real-time message updates via Convex subscriptions

Messages display inline without avatars. User messages align right, AI responses align left.

### Backend

Three Convex files handle the chat logic:

**convex/schema.ts**
Defines the `aiChats` table with fields for userId, date, and a messages array. Each message stores role, content, and timestamp.

**convex/aiChats.ts**
Contains queries and mutations:

- `getAIChatByDate` - fetches chat history for a specific date
- `getOrCreateAIChat` - creates a new chat session if none exists
- `addUserMessage` - appends user messages to the chat
- `addAssistantMessage` - appends AI responses
- `clearChat` - removes all messages from a session
- `getAIChatCountByDate` - returns message count for sidebar display

**convex/aiChatActions.ts**
The action that calls Claude's API. It:

1. Retrieves conversation history for context
2. Sends the full context to Claude
3. Stores the response back in the database

### Data flow

1. User types a message and hits Enter
2. Frontend calls `addUserMessage` mutation
3. Frontend triggers `generateResponse` action
4. Action loads conversation history from database
5. Action sends context + new message to Claude API
6. Action receives response and calls `addAssistantMessage`
7. Convex subscription pushes update to frontend
8. UI renders new message

## Chat memory

Each chat session maintains full conversation history. When generating a response, the action loads all previous messages and sends them as context. This gives Claude awareness of the entire conversation.

Messages persist in the database until manually cleared.

## Sidebar integration

The sidebar shows a "Chat" link under each date that has chat history. Clicking it opens the chat view for that date. The link uses the same styling as note items for visual consistency.

## Model

The feature uses Claude claude-sonnet-4-20250514 via the Anthropic SDK. The model selection and system prompt configuration happen server-side in the Convex action.

## Authentication

Chat sessions are tied to authenticated users. The `getUserId` helper verifies identity before any database operations. Unauthenticated users cannot access chat features.

## Privacy

User messages and AI responses are stored in the Convex database under the user's account.

**System prompt privacy:**
The system prompt is split across 3 environment variables in Convex (to stay under the 8KB limit per variable):

| Variable                  | Content                                | File reference                      |
| ------------------------- | -------------------------------------- | ----------------------------------- |
| `CLAUDE_PROMPT_STYLE`     | Writing style, voice models, templates | `writing/prompt-part1-style.md`     |
| `CLAUDE_PROMPT_COMMUNITY` | Community content guidelines           | `writing/prompt-part2-community.md` |
| `CLAUDE_PROMPT_RULES`     | AI detection avoidance rules           | `writing/prompt-part3-rules.md`     |

This keeps the prompts:

- Out of the source code repository
- Invisible on GitHub (the `writing/` folder is gitignored)
- Only accessible server-side

The code combines all 3 parts at runtime. If none are set, it falls back to a minimal default prompt. You can also use a single `CLAUDE_SYSTEM_PROMPT` variable if preferred.

## Files

| File                            | Purpose                               |
| ------------------------------- | ------------------------------------- |
| `src/components/AIChatView.tsx` | Chat UI component                     |
| `convex/schema.ts`              | Database schema for aiChats table     |
| `convex/aiChats.ts`             | Queries and mutations                 |
| `convex/aiChatActions.ts`       | Claude API integration                |
| `src/styles/global.css`         | Chat styling (search for `.ai-chat-`) |
| `src/components/Sidebar.tsx`    | Chat link in sidebar                  |
