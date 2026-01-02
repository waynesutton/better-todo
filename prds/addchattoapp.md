# Add AI Chat to App - Product Requirements Document

A comprehensive guide for implementing an AI-powered chat feature in a Convex + React application, based on the better-todo implementation. This feature provides contextual AI assistance with full conversation history, image attachments, link scraping, and a polished UI.

## Overview

The AI chat feature adds a conversational interface powered by Claude (Anthropic) that provides writing assistance and contextual help. Each chat session is scoped to a specific context (e.g., date, project, document) and maintains full conversation history with real-time updates via Convex subscriptions.

## Key Features

- Real-time chat interface with message history
- Full markdown rendering for AI responses
- Image attachments (up to 3 per message)
- Link attachments with automatic content scraping
- Auto-expanding textarea input
- Input position toggle (centered/left-aligned)
- Clear chat command (`"clear"`)
- Copy button on AI messages
- Stop generation button
- Keyboard shortcuts (Enter to send, Shift+Enter for new line, "/" to focus)
- Mobile-optimized responsive design
- Theme-aware styling
- Searchable chat content

## Architecture

### Technology Stack

- **Backend**: Convex (queries, mutations, actions)
- **AI Provider**: Anthropic Claude (`claude-sonnet-4-20250514`)
- **Frontend**: React with TypeScript
- **Styling**: CSS with CSS variables for theming
- **Markdown**: `react-markdown` with `remark-gfm`
- **URL Scraping**: Firecrawl (optional)

### Data Flow

1. User types message and sends (Enter key or button click)
2. Frontend calls `addUserMessageWithAttachments` mutation
3. Frontend triggers `generateResponse` action
4. Action loads conversation history (last 20 messages)
5. Action processes attachments (uploads images, scrapes links)
6. Action sends context + new message to Claude API
7. Action receives response and calls `addAssistantMessage` mutation
8. Convex subscription pushes update to frontend
9. UI renders new message with markdown

## Database Schema

### Table: `aiChats`

Add to `convex/schema.ts`:

```typescript
aiChats: defineTable({
  userId: v.string(), // From auth.getUserIdentity().subject
  date: v.string(), // Context identifier (e.g., "2025-01-15" or "project-123")
  messages: v.array(
    v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
      timestamp: v.number(),
      attachments: v.optional(
        v.array(
          v.object({
            type: v.union(v.literal("image"), v.literal("link")),
            storageId: v.optional(v.id("_storage")),
            url: v.optional(v.string()),
            scrapedContent: v.optional(v.string()),
            title: v.optional(v.string()),
          }),
        ),
      ),
    }),
  ),
  lastMessageAt: v.optional(v.number()),
  searchableContent: v.optional(v.string()), // Concatenated message content for search
})
  .index("by_user_and_date", ["userId", "date"])
  .index("by_user", ["userId"])
  .searchIndex("search_messages", {
    searchField: "searchableContent",
    filterFields: ["userId"],
  }),
```

**Schema Notes:**
- `date` field is flexible - can be any context identifier (date string, project ID, document ID, etc.)
- `searchableContent` enables full-text search across all messages in a chat
- Indexes support efficient user-scoped queries

## Backend Implementation

### File: `convex/aiChats.ts`

Contains all queries and mutations for chat management:

**Queries:**
- `getAIChatByDate` - Fetch chat for specific context (requires auth)
- `getAIChatCounts` - Get message counts per context for sidebar display
- `getStorageUrl` - Get Convex storage URL for images (requires auth)

**Mutations:**
- `getOrCreateAIChat` - Create new chat session if none exists
- `addUserMessage` - Add user message (simple version)
- `addUserMessageWithAttachments` - Add user message with image/link attachments
- `addAssistantMessage` - Internal mutation to add AI response
- `clearChat` - Clear all messages from a session
- `deleteChat` - Delete entire chat session
- `generateUploadUrl` - Generate Convex storage upload URL for images

**Internal Functions:**
- `getAIChatInternal` - Internal query for use in actions
- `getStorageUrlInternal` - Internal query for storage URLs

**Key Implementation Details:**
- All mutations verify ownership using indexed queries with `userId`
- Mutations are idempotent (return null instead of throwing for missing resources)
- `searchableContent` is updated whenever messages are added
- Ownership checks use `withIndex("by_user", ...)` pattern for security

### File: `convex/aiChatActions.ts`

Contains the action that calls Claude API. Must have `"use node";` directive at top.

**Action: `generateResponse`**
- Args: `chatId`, `userMessage`, `attachments` (optional)
- Returns: `string` (AI response)
- Process:
  1. Verify authentication
  2. Load API key from `ANTHROPIC_API_KEY` environment variable
  3. Build system prompt from environment variables (see Environment Variables section)
  4. Get chat history (last 20 messages)
  5. Process attachments:
     - Upload images to Convex storage
     - Scrape link content using Firecrawl (optional)
  6. Build Claude message array with history + new message
  7. Call Claude API with system prompt
  8. Save response via `addAssistantMessage` mutation
  9. Return response text

**Helper Functions:**
- `buildSystemPrompt()` - Combines split environment variables into full prompt
- `scrapeUrl()` - Scrapes URL content using Firecrawl API (optional)

**Key Implementation Details:**
- Uses `claude-sonnet-4-20250514` model
- Max tokens: 2048
- Last 20 messages sent as context
- Supports vision (image attachments)
- Auto-detects URLs in messages (up to 3)
- Handles complex message content (text + images + scraped content)

## Frontend Implementation

### File: `src/components/AIChatView.tsx`

Main chat component with full UI implementation.

**Props:**
```typescript
interface AIChatViewProps {
  date: string; // Context identifier
  onClose?: () => void; // Optional close handler
}
```

**State Management:**
- `inputValue` - Current textarea input
- `isLoading` - AI generation in progress
- `isStopped` - Generation was stopped
- `copiedMessageIndex` - Which message was copied (for UI feedback)
- `isInputCentered` - Input position preference (persisted to localStorage)
- `isMobile` - Mobile device detection
- `attachments` - Array of image/link attachments
- `showLinkModal` - Link input modal visibility
- `linkInputValue` - Link URL input value
- `isUploading` - Image upload in progress

**Key Features:**

1. **Auto-scroll**: Messages container scrolls to bottom on new messages
2. **Auto-focus**: Input focused on mount and after sending
3. **Auto-resize**: Textarea expands based on content (max 200px)
4. **Keyboard shortcuts**:
   - Enter: Send message
   - Shift+Enter: New line
   - "/": Focus input (when not in input/textarea)
5. **Clear command**: Type `"clear"` to clear chat history
6. **Stop generation**: Button to abort AI response
7. **Copy messages**: Copy button on each AI message
8. **Input position toggle**: Pin button to center/left-align input
9. **Attachments**:
   - Image upload (max 3, PNG/JPEG/GIF/WebP, 3MB max)
   - Link attachment (max 3)
   - Preview before sending
   - Remove before sending

**Convex Hooks Used:**
- `useQuery(api.aiChats.getAIChatByDate)` - Fetch chat history
- `useMutation(api.aiChats.getOrCreateAIChat)` - Create chat if needed
- `useMutation(api.aiChats.addUserMessageWithAttachments)` - Add user message
- `useAction(api.aiChatActions.generateResponse)` - Generate AI response
- `useMutation(api.aiChats.clearChat)` - Clear chat
- `useMutation(api.aiChats.generateUploadUrl)` - Get upload URL

**UI Components:**
- Messages list with markdown rendering
- Loading state with spinner and stop button
- Stopped state indicator
- Input container with attachment buttons
- Attachment preview area
- Link input modal
- Copy confirmation feedback

### Integration in Main App

**In `src/App.tsx` (or main component):**

1. Add state for chat visibility:
```typescript
const [showAIChat, setShowAIChat] = useState(false);
```

2. Add toggle button in header:
```typescript
{!showAIChat && (
  <button
    className="search-button"
    onClick={() => {
      if (!isAuthenticated) {
        setShowSignInToChatModal(true);
      } else {
        setShowAIChat(true);
      }
    }}
    title="AI Writing Assistant"
  >
    <MessageCircle size={18} />
  </button>
)}
```

3. Add back button when chat is open:
```typescript
{showAIChat && (
  <button
    className="search-button"
    onClick={() => {
      setShowAIChat(false);
    }}
    title="Back to todos"
  >
    <X size={18} />
  </button>
)}
```

4. Conditionally render chat view:
```typescript
{showAIChat ? (
  <AIChatView
    date={selectedDate}
    onClose={() => setShowAIChat(false)}
  />
) : (
  // ... other content
)}
```

5. Hide other UI elements when chat is open:
```typescript
{!showAIChat && (
  // ... other UI elements
)}
```

## Environment Variables

### Required Variables

Add to Convex deployment environment variables:

**`ANTHROPIC_API_KEY`** (Required)
- Your Anthropic API key
- Get from: https://console.anthropic.com
- Used in `aiChatActions.ts` to authenticate Claude API calls

**`FIRECRAWL_API_KEY`** (Optional)
- Firecrawl API key for URL content scraping
- Get from: https://firecrawl.dev
- If not set, link attachments won't scrape content (links still work)

### System Prompt Variables

The system prompt can be split across multiple environment variables to stay under Convex's 8KB limit per variable:

**Option 1: Split Prompt (Recommended for long prompts)**

- `CLAUDE_PROMPT_STYLE` - Writing style, voice, templates
- `CLAUDE_PROMPT_COMMUNITY` - Community guidelines, tone
- `CLAUDE_PROMPT_RULES` - AI detection avoidance, formatting rules

The code automatically combines these with `\n\n---\n\n` separators.

**Option 2: Single Prompt**

- `CLAUDE_SYSTEM_PROMPT` - Complete system prompt in one variable

**Option 3: Fallback**

If no environment variables are set, uses minimal default:
```
"You are a helpful writing assistant. Help users write clearly and concisely."
```

**Implementation:**
```typescript
function buildSystemPrompt(): string {
  const part1 = process.env.CLAUDE_PROMPT_STYLE || "";
  const part2 = process.env.CLAUDE_PROMPT_COMMUNITY || "";
  const part3 = process.env.CLAUDE_PROMPT_RULES || "";

  const parts = [part1, part2, part3].filter((p) => p.trim());

  if (parts.length > 0) {
    return parts.join("\n\n---\n\n");
  }

  return process.env.CLAUDE_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;
}
```

**Privacy Note:**
Store prompt content in environment variables (not in code) to:
- Keep prompts out of source code repository
- Make prompts invisible on GitHub
- Allow easy updates without code changes
- Maintain privacy of prompt content

## Styling

### CSS Variables

The chat uses theme-aware CSS variables. Ensure your app has these defined:

```css
:root {
  --bg-primary: /* Main background */
  --bg-secondary: /* Secondary background (message bubbles) */
  --bg-hover: /* Hover states */
  --text-primary: /* Primary text color */
  --text-secondary: /* Secondary text color */
  --mobile-add-button-bg: /* Accent color (user messages, buttons) */
  --border-color: /* Border color */
}
```

### CSS Classes

All chat styles are prefixed with `.ai-chat-`:

- `.ai-chat-view` - Main container
- `.ai-chat-messages` - Messages container
- `.ai-chat-message` - Individual message
- `.ai-chat-message-user` - User message (right-aligned)
- `.ai-chat-message-assistant` - AI message (left-aligned)
- `.ai-chat-message-content` - Message content area
- `.ai-chat-input-container` - Input area container
- `.ai-chat-input-wrapper` - Input wrapper (supports centered/left positioning)
- `.ai-chat-input` - Textarea input
- `.ai-chat-send-button` - Send button
- `.ai-chat-copy-button` - Copy button on messages
- `.ai-chat-attachments-preview` - Attachment preview area
- `.ai-chat-link-modal` - Link input modal

**Key Styling Features:**
- Responsive design (mobile/tablet/desktop)
- Theme-aware colors
- Smooth transitions
- Proper text wrapping
- Markdown styling (headers, lists, code blocks, links)
- Loading states
- Hover effects

See `src/styles/global.css` (lines 9150-10184) for complete styling reference.

## Authentication

### Requirements

- All chat operations require authentication
- Use `ctx.auth.getUserIdentity()` in all mutations/queries
- Return `null` for unauthenticated users in queries
- Throw error for unauthenticated users in mutations
- Verify ownership using indexed queries with `userId`

### Implementation Pattern

```typescript
// In queries
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  return null; // or empty array/object
}
const userId = identity.subject;

// In mutations
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  throw new Error("Not authenticated");
}
const userId = identity.subject;

// Ownership verification
const chat = await ctx.db
  .query("aiChats")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .filter((q) => q.eq(q.field("_id"), args.chatId))
  .unique();

if (!chat) {
  throw new Error("Chat not found or unauthorized");
}
```

## Dependencies

### Package.json

Add these dependencies:

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.2",
    "@mendable/firecrawl-js": "^1.21.1",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1"
  }
}
```

**Dependencies Explained:**
- `@anthropic-ai/sdk` - Official Anthropic SDK for Claude API
- `@mendable/firecrawl-js` - URL content scraping (optional)
- `react-markdown` - Markdown rendering for AI responses
- `remark-gfm` - GitHub Flavored Markdown support

## Implementation Checklist

### Backend Setup

- [ ] Add `aiChats` table to `convex/schema.ts`
- [ ] Create `convex/aiChats.ts` with all queries and mutations
- [ ] Create `convex/aiChatActions.ts` with `generateResponse` action
- [ ] Add `"use node";` directive to `aiChatActions.ts`
- [ ] Add indexes: `by_user_and_date`, `by_user`
- [ ] Add search index: `search_messages` on `searchableContent`
- [ ] Implement ownership verification in all mutations
- [ ] Make mutations idempotent

### Environment Variables

- [ ] Add `ANTHROPIC_API_KEY` to Convex deployment
- [ ] (Optional) Add `FIRECRAWL_API_KEY` for link scraping
- [ ] (Optional) Add `CLAUDE_PROMPT_STYLE`, `CLAUDE_PROMPT_COMMUNITY`, `CLAUDE_PROMPT_RULES`
- [ ] (Or) Add `CLAUDE_SYSTEM_PROMPT` for single prompt

### Frontend Setup

- [ ] Install dependencies: `@anthropic-ai/sdk`, `react-markdown`, `remark-gfm`
- [ ] (Optional) Install `@mendable/firecrawl-js` for link scraping
- [ ] Create `src/components/AIChatView.tsx` component
- [ ] Add chat state management to main app
- [ ] Add chat toggle button to header
- [ ] Add conditional rendering for chat view
- [ ] Import and use `AIChatView` component

### Styling

- [ ] Copy chat CSS from `src/styles/global.css` (`.ai-chat-*` classes)
- [ ] Ensure theme CSS variables are defined
- [ ] Test responsive design (mobile/tablet/desktop)
- [ ] Verify markdown rendering styles
- [ ] Test theme switching

### Features

- [ ] Test message sending and receiving
- [ ] Test image attachments (upload, preview, remove)
- [ ] Test link attachments (with/without Firecrawl)
- [ ] Test clear command (`"clear"`)
- [ ] Test stop generation button
- [ ] Test copy message button
- [ ] Test input position toggle
- [ ] Test keyboard shortcuts (Enter, Shift+Enter, "/")
- [ ] Test mobile responsiveness
- [ ] Test authentication flow (signed in/out)

### Integration

- [ ] Add chat indicator in sidebar (if applicable)
- [ ] Add chat counts query for sidebar display
- [ ] Test chat persistence across page refreshes
- [ ] Test multiple chat sessions (different contexts)
- [ ] Verify real-time updates work

## Customization Points

### Context Identifier

The `date` field in the schema is flexible. You can use it for:
- Date strings: `"2025-01-15"`
- Project IDs: `"project-123"`
- Document IDs: `"doc-456"`
- Any string identifier: `"workspace-789"`

Update the prop name and usage accordingly:
```typescript
interface AIChatViewProps {
  contextId: string; // Instead of "date"
  onClose?: () => void;
}
```

### Model Selection

Change Claude model in `aiChatActions.ts`:
```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514", // Change this
  max_tokens: 2048, // Adjust as needed
  system: systemPrompt,
  messages: claudeMessages,
});
```

Available models:
- `claude-sonnet-4-20250514` (current)
- `claude-opus-4-20250514`
- `claude-3-5-sonnet-20241022`
- `claude-3-opus-20240229`

### Message Context Window

Adjust how many messages are sent as context:
```typescript
// In aiChatActions.ts
const recentMessages = chat.messages.slice(-20); // Change -20 to desired count
```

### Attachment Limits

Adjust limits in `AIChatView.tsx`:
```typescript
// Max images per message
const availableSlots = 3 - currentImageCount; // Change 3

// Max links per message
if (linkCount >= 3) { // Change 3

// Max file size
const maxSize = 3 * 1024 * 1024; // Change 3MB
```

### UI Customization

- Input placeholder text
- Empty state message
- Loading state text
- Button labels
- Modal titles
- Error messages

## Security Considerations

1. **Authentication**: All operations require authentication
2. **Ownership Verification**: Always verify user owns chat before operations
3. **API Keys**: Store in Convex environment variables (never in code)
4. **System Prompts**: Store in environment variables (keep private)
5. **File Uploads**: Validate file types and sizes
6. **URL Scraping**: Limit to trusted domains if needed
7. **Rate Limiting**: Consider adding rate limits for API calls
8. **Input Validation**: Validate all user inputs

## Testing

### Manual Testing Checklist

- [ ] Send text message
- [ ] Send message with image attachment
- [ ] Send message with link attachment
- [ ] Send message with multiple attachments
- [ ] Clear chat with `"clear"` command
- [ ] Stop AI generation mid-response
- [ ] Copy AI message to clipboard
- [ ] Toggle input position
- [ ] Test keyboard shortcuts
- [ ] Test on mobile device
- [ ] Test with different themes
- [ ] Test authentication flow
- [ ] Test multiple chat sessions
- [ ] Test real-time updates (open in two tabs)

### Edge Cases

- [ ] Very long messages
- [ ] Messages with special characters
- [ ] Empty messages (should be prevented)
- [ ] Large image files (should be rejected)
- [ ] Invalid URLs (should be handled)
- [ ] Network errors during API call
- [ ] Concurrent messages from same user
- [ ] Chat deleted while generating response

## Troubleshooting

### Common Issues

**AI not responding:**
- Check `ANTHROPIC_API_KEY` is set in Convex
- Check API key is valid
- Check Convex action logs for errors
- Verify model name is correct

**Images not uploading:**
- Check Convex storage is enabled
- Verify `generateUploadUrl` mutation works
- Check file size limits
- Verify file type is allowed

**Links not scraping:**
- Check `FIRECRAWL_API_KEY` is set (optional)
- Verify Firecrawl API key is valid
- Check action logs for scraping errors
- Links work without scraping (just won't include content)

**Messages not appearing:**
- Check Convex subscription is working
- Verify query is not skipped (check auth)
- Check browser console for errors
- Verify mutations are completing

**Styling issues:**
- Ensure CSS variables are defined
- Check CSS classes are imported
- Verify theme switching works
- Test responsive breakpoints

## Performance Considerations

1. **Message History**: Only last 20 messages sent to Claude (adjustable)
2. **Search Index**: `searchableContent` enables fast full-text search
3. **Image Optimization**: Consider compressing images before upload
4. **Lazy Loading**: Messages load on demand (via Convex subscriptions)
5. **Debouncing**: Consider debouncing rapid message sends
6. **Caching**: Convex handles caching automatically

## Future Enhancements

Potential improvements to consider:

- Voice input/output
- Message editing
- Message deletion (individual)
- Export chat history
- Share chat sessions
- Chat templates/prompts
- Multi-modal support (more file types)
- Streaming responses
- Typing indicators
- Message reactions
- Chat search within conversation
- Chat export (markdown, PDF)

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [React Markdown](https://github.com/remarkjs/react-markdown)
- [Firecrawl Documentation](https://docs.firecrawl.dev)

## File Reference

Complete implementation files to reference:

- `convex/schema.ts` - Database schema
- `convex/aiChats.ts` - Queries and mutations
- `convex/aiChatActions.ts` - Claude API integration
- `src/components/AIChatView.tsx` - React component
- `src/styles/global.css` - Styling (lines 9150-10184)
- `src/App.tsx` - Integration example

## Summary

This PRD provides a complete guide for implementing an AI chat feature in a Convex + React application. The implementation includes:

- Full backend (Convex queries, mutations, actions)
- Complete frontend (React component with all features)
- Environment variable setup (including split prompt system)
- Styling guide
- Authentication patterns
- Security considerations
- Testing checklist
- Customization points

Follow the implementation checklist step-by-step to add the feature to your app. Customize the context identifier, model selection, and UI to match your app's needs.

