import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";

// Attachment validator for images and links
const attachmentValidator = v.object({
  type: v.union(v.literal("image"), v.literal("link")),
  storageId: v.optional(v.id("_storage")),
  url: v.optional(v.string()),
  scrapedContent: v.optional(v.string()),
  title: v.optional(v.string()),
});

// Message validator for reuse (with attachments support)
const messageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  timestamp: v.number(),
  attachments: v.optional(v.array(attachmentValidator)),
});

// Get AI chat for a specific date
export const getAIChatByDate = query({
  args: {
    date: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("aiChats"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.string(),
      messages: v.array(messageValidator),
      lastMessageAt: v.optional(v.number()),
      searchableContent: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = identity.subject;

    const chat = await ctx.db
      .query("aiChats")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .unique();

    return chat;
  },
});

// Get counts of AI chats per date (for sidebar display)
export const getAIChatCounts = query({
  args: {},
  returns: v.record(v.string(), v.number()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {};
    }
    const userId = identity.subject;

    const chats = await ctx.db
      .query("aiChats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Group chats by date and count messages
    const counts: Record<string, number> = {};
    for (const chat of chats) {
      if (chat.messages.length > 0) {
        counts[chat.date] = chat.messages.length;
      }
    }

    return counts;
  },
});

// Create or get AI chat for a date
export const getOrCreateAIChat = mutation({
  args: {
    date: v.string(),
  },
  returns: v.id("aiChats"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Check if chat already exists
    const existing = await ctx.db
      .query("aiChats")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", args.date),
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    // Create new chat
    const chatId = await ctx.db.insert("aiChats", {
      userId,
      date: args.date,
      messages: [],
      lastMessageAt: Date.now(),
      searchableContent: "",
    });

    return chatId;
  },
});

// Add a user message to the chat
export const addUserMessage = mutation({
  args: {
    chatId: v.id("aiChats"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const chat = await ctx.db
      .query("aiChats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .unique();

    if (!chat) {
      throw new Error("Chat not found or unauthorized");
    }

    const newMessage = {
      role: "user" as const,
      content: args.content,
      timestamp: Date.now(),
    };

    const updatedMessages = [...chat.messages, newMessage];
    // Update searchableContent with all message contents
    const searchableContent = updatedMessages
      .map((msg) => msg.content)
      .join(" ");

    await ctx.db.patch(args.chatId, {
      messages: updatedMessages,
      lastMessageAt: Date.now(),
      searchableContent,
    });

    return null;
  },
});

// Internal mutation to add assistant message (called from action)
export const addAssistantMessage = internalMutation({
  args: {
    chatId: v.id("aiChats"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      return null;
    }

    const newMessage = {
      role: "assistant" as const,
      content: args.content,
      timestamp: Date.now(),
    };

    const updatedMessages = [...chat.messages, newMessage];
    // Update searchableContent with all message contents
    const searchableContent = updatedMessages
      .map((msg) => msg.content)
      .join(" ");

    await ctx.db.patch(args.chatId, {
      messages: updatedMessages,
      lastMessageAt: Date.now(),
      searchableContent,
    });

    return null;
  },
});

// Internal query to get chat (for use in actions)
export const getAIChatInternal = internalQuery({
  args: {
    chatId: v.id("aiChats"),
  },
  returns: v.union(
    v.object({
      _id: v.id("aiChats"),
      _creationTime: v.number(),
      userId: v.string(),
      date: v.string(),
      messages: v.array(messageValidator),
      lastMessageAt: v.optional(v.number()),
      searchableContent: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chatId);
  },
});

// Clear chat history for a date
export const clearChat = mutation({
  args: {
    chatId: v.id("aiChats"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const chat = await ctx.db
      .query("aiChats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .unique();

    if (!chat) {
      return null; // Idempotent
    }

    await ctx.db.patch(args.chatId, {
      messages: [],
      lastMessageAt: Date.now(),
      searchableContent: "",
    });

    return null;
  },
});

// Delete entire chat
export const deleteChat = mutation({
  args: {
    chatId: v.id("aiChats"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const chat = await ctx.db
      .query("aiChats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .unique();

    if (!chat) {
      return null; // Idempotent
    }

    await ctx.db.delete(args.chatId);
    return null;
  },
});

// Generate upload URL for image uploads in AI chat
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Get storage URL for an uploaded image
export const getStorageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Internal query to get storage URL (for use in actions)
export const getStorageUrlInternal = internalQuery({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Add a user message with attachments to the chat
export const addUserMessageWithAttachments = mutation({
  args: {
    chatId: v.id("aiChats"),
    content: v.string(),
    attachments: v.optional(
      v.array(
        v.object({
          type: v.union(v.literal("image"), v.literal("link")),
          storageId: v.optional(v.id("_storage")),
          url: v.optional(v.string()),
        }),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // Verify ownership using indexed query
    const chat = await ctx.db
      .query("aiChats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.chatId))
      .unique();

    if (!chat) {
      throw new Error("Chat not found or unauthorized");
    }

    // Build attachments array with proper structure
    const attachments = args.attachments?.map((att) => ({
      type: att.type,
      storageId: att.storageId,
      url: att.url,
      scrapedContent: undefined, // Will be filled by action
      title: undefined,
    }));

    const newMessage = {
      role: "user" as const,
      content: args.content,
      timestamp: Date.now(),
      attachments:
        attachments && attachments.length > 0 ? attachments : undefined,
    };

    const updatedMessages = [...chat.messages, newMessage];
    // Update searchableContent with all message contents
    const searchableContent = updatedMessages
      .map((msg) => msg.content)
      .join(" ");

    await ctx.db.patch(args.chatId, {
      messages: updatedMessages,
      lastMessageAt: Date.now(),
      searchableContent,
    });

    return null;
  },
});
