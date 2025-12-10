"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";

// Minimal fallback prompt - the full prompts should be stored in env vars for privacy
const DEFAULT_SYSTEM_PROMPT = `You are a helpful writing assistant. Help users write clearly and concisely.`;

// Build system prompt from environment variables (split for Convex 8KB limit)
function buildSystemPrompt(): string {
  const part1 = process.env.CLAUDE_PROMPT_STYLE || "";
  const part2 = process.env.CLAUDE_PROMPT_COMMUNITY || "";
  const part3 = process.env.CLAUDE_PROMPT_RULES || "";

  // Combine parts if any exist
  const parts = [part1, part2, part3].filter((p) => p.trim());

  if (parts.length > 0) {
    return parts.join("\n\n---\n\n");
  }

  // Fall back to single env var or default
  return process.env.CLAUDE_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;
}

// Generate AI response using Claude
export const generateResponse = action({
  args: {
    chatId: v.id("aiChats"),
    userMessage: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Build system prompt from environment variables
    const systemPrompt = buildSystemPrompt();

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey,
    });

    // Get chat history for context
    const chat = await ctx.runQuery(internal.aiChats.getAIChatInternal, {
      chatId: args.chatId,
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Build message history for Claude (last 20 messages for context)
    const recentMessages = chat.messages.slice(-20);
    const claudeMessages: Array<{
      role: "user" | "assistant";
      content: string;
    }> = recentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add the new user message
    claudeMessages.push({
      role: "user",
      content: args.userMessage,
    });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: systemPrompt,
      messages: claudeMessages,
    });

    // Extract text response
    const textContent = response.content.find((block) => block.type === "text");
    const assistantMessage =
      textContent?.type === "text"
        ? textContent.text
        : "I apologize, but I could not generate a response.";

    // Save the assistant message
    await ctx.runMutation(internal.aiChats.addAssistantMessage, {
      chatId: args.chatId,
      content: assistantMessage,
    });

    return assistantMessage;
  },
});
