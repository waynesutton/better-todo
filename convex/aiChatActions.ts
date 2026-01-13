"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import Firecrawl from "@mendable/firecrawl-js";

// Minimal fallback prompt - the full prompts should be stored in env vars for privacy
const DEFAULT_SYSTEM_PROMPT = `You are a helpful writing assistant. Help users write clearly and concisely.`;

// URL regex pattern for auto-detection
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

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

// Scrape URL content using Firecrawl
async function scrapeUrl(
  url: string,
): Promise<{ title: string; content: string } | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.warn("FIRECRAWL_API_KEY not configured, skipping URL scraping");
    return null;
  }

  try {
    const firecrawl = new Firecrawl({ apiKey });
    const result = await firecrawl.scrapeUrl(url, {
      formats: ["markdown"],
    });

    if (result.success && result.markdown) {
      // Truncate content to avoid token limits (max 8000 chars)
      const truncatedContent = result.markdown.slice(0, 8000);
      return {
        title: result.metadata?.title || url,
        content: truncatedContent,
      };
    }
    return null;
  } catch (error) {
    console.error("Firecrawl scrape error:", error);
    return null;
  }
}

// Generate AI response using Claude with support for images and links
export const generateResponse = action({
  args: {
    chatId: v.id("aiChats"),
    userMessage: v.string(),
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
  returns: v.string(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user's personal API key (required)
    const apiKey: string | null = await ctx.runQuery(internal.userApiKeys.getApiKeyInternal, {
      userId: identity.subject,
      provider: "anthropic",
    });
    
    if (!apiKey) {
      throw new Error(
        "No Anthropic API key configured. Please add your API key in Settings (press ?)."
      );
    }

    // Build system prompt from environment variables
    const systemPrompt = buildSystemPrompt();

    // Initialize Anthropic client
    const anthropic: Anthropic = new Anthropic({
      apiKey,
    });

    // Get chat history for context
    const chat = await ctx.runQuery(internal.aiChats.getAIChatInternal, {
      chatId: args.chatId,
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Collect URLs to scrape (from attachments and auto-detected in message)
    const urlsToScrape: string[] = [];
    const imageUrls: string[] = [];

    // Process explicit attachments
    if (args.attachments && args.attachments.length > 0) {
      for (const attachment of args.attachments) {
        if (attachment.type === "link" && attachment.url) {
          urlsToScrape.push(attachment.url);
        } else if (attachment.type === "image" && attachment.storageId) {
          // Get image URL from Convex storage
          const imageUrl = await ctx.runQuery(
            internal.aiChats.getStorageUrlInternal,
            {
              storageId: attachment.storageId,
            },
          );
          if (imageUrl) {
            imageUrls.push(imageUrl);
          }
        }
      }
    }

    // Auto-detect URLs in the message (limit to 3)
    const detectedUrls = args.userMessage.match(URL_REGEX) || [];
    for (const url of detectedUrls.slice(0, 3)) {
      if (!urlsToScrape.includes(url)) {
        urlsToScrape.push(url);
      }
    }

    // Scrape URLs in parallel (max 3)
    const scrapedContents: Array<{
      url: string;
      title: string;
      content: string;
    }> = [];
    const scrapePromises = urlsToScrape.slice(0, 3).map(async (url) => {
      const scraped = await scrapeUrl(url);
      if (scraped) {
        scrapedContents.push({ url, ...scraped });
      }
    });
    await Promise.all(scrapePromises);

    // Build message history for Claude (last 20 messages for context)
    const recentMessages = chat.messages.slice(-20);

    // Build Claude messages with proper typing
    type ClaudeMessageContent =
      | string
      | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;
    const claudeMessages: Array<{
      role: "user" | "assistant";
      content: ClaudeMessageContent;
    }> = recentMessages.map((msg: { role: "user" | "assistant"; content: string }) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Build the new user message content
    let messageContent: ClaudeMessageContent;

    // If we have images or scraped content, build a complex message
    if (imageUrls.length > 0 || scrapedContents.length > 0) {
      const contentBlocks: Array<
        Anthropic.TextBlockParam | Anthropic.ImageBlockParam
      > = [];

      // Add images first (Claude vision)
      for (const imageUrl of imageUrls) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "url",
            url: imageUrl,
          },
        });
      }

      // Build text content with scraped URLs
      let textContent = args.userMessage;

      if (scrapedContents.length > 0) {
        textContent += "\n\n---\n\n**Referenced Content:**\n\n";
        for (const scraped of scrapedContents) {
          textContent += `### ${scraped.title}\n*Source: ${scraped.url}*\n\n${scraped.content}\n\n---\n\n`;
        }
      }

      contentBlocks.push({
        type: "text",
        text: textContent,
      });

      messageContent = contentBlocks;
    } else {
      messageContent = args.userMessage;
    }

    // Add the new user message
    claudeMessages.push({
      role: "user",
      content: messageContent,
    });

    // Call Claude API
    const response: Anthropic.Message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: claudeMessages,
    });

    // Extract text response
    const textContent: Anthropic.ContentBlock | undefined = response.content.find(
      (block: Anthropic.ContentBlock) => block.type === "text"
    );
    const assistantMessage: string =
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

// Internal action to scrape a single URL (for testing/debugging)
export const scrapeUrlAction = internalAction({
  args: {
    url: v.string(),
  },
  returns: v.union(
    v.object({
      title: v.string(),
      content: v.string(),
    }),
    v.null(),
  ),
  handler: async (_ctx, args) => {
    return await scrapeUrl(args.url);
  },
});
