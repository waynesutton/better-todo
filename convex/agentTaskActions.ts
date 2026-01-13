"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// System prompts for different task types
const TASK_PROMPTS: Record<string, string> = {
  expand: `You are a helpful assistant that expands on ideas. When given content, research the topic mentally, brainstorm related concepts, and create a detailed plan or elaboration. Be thorough but organized. Use markdown formatting for clarity with headers, lists, and sections as appropriate.`,
  
  code: `You are an expert programmer. When given a task description, generate clean, well-documented code to implement it. Include comments explaining your approach. If the language isn't specified, use TypeScript/JavaScript. Use markdown code blocks with appropriate language tags. Explain any important decisions or trade-offs.`,
  
  summarize: `You are a concise summarizer. When given content, extract the key points and organize them into a clear, actionable summary. Use bullet points and short paragraphs. Remove fluff and focus on what matters most. Use markdown formatting.`,
  
  analyze: `You are a thoughtful analyst. When given content, analyze it critically and provide constructive feedback, suggestions for improvement, potential issues to consider, and alternative approaches. Be specific and actionable. Use markdown formatting with clear sections.`,
  
  other: `You are a helpful AI assistant. Follow the user's instructions carefully and provide a thorough, well-organized response. Use markdown formatting as appropriate.`,
};

// Process an agent task using Claude or OpenAI
export const processAgentTask = internalAction({
  args: {
    taskId: v.id("agentTasks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the task details
    const task = await ctx.runQuery(internal.agentTasks.getTaskForProcessing, {
      taskId: args.taskId,
    });

    if (!task) {
      console.error("Task not found:", args.taskId);
      return null;
    }

    // Update status to processing
    await ctx.runMutation(internal.agentTasks.updateTaskStatus, {
      taskId: args.taskId,
      status: "processing",
    });

    try {
      let result: string;

      // Get the appropriate system prompt
      let systemPrompt = TASK_PROMPTS[task.taskType] || TASK_PROMPTS.expand;

      // Build the user message with context
      let userMessage = task.sourceTitle
        ? `Title: ${task.sourceTitle}\n\nContent:\n${task.sourceContent}`
        : task.sourceContent;

      // For "other" task type, prepend custom instructions
      if (task.taskType === "other" && task.customInstructions) {
        userMessage = `Instructions: ${task.customInstructions}\n\n${userMessage}`;
      }

      // Fetch user's API key for the selected provider
      const userApiKey = await ctx.runQuery(internal.userApiKeys.getApiKeyInternal, {
        userId: task.userId,
        provider: task.provider === "claude" ? "anthropic" : "openai",
      });

      if (task.provider === "claude") {
        result = await processWithClaude(systemPrompt, userMessage, userApiKey);
      } else {
        result = await processWithOpenAI(systemPrompt, userMessage, userApiKey);
      }

      // Update task with result
      await ctx.runMutation(internal.agentTasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "completed",
        result,
      });
    } catch (error) {
      console.error("Error processing agent task:", error);
      
      // Update task with error
      await ctx.runMutation(internal.agentTasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }

    return null;
  },
});

// Process a follow-up message in an existing conversation
export const processFollowUp = internalAction({
  args: {
    taskId: v.id("agentTasks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the task with full conversation history
    const task = await ctx.runQuery(internal.agentTasks.getTaskForProcessing, {
      taskId: args.taskId,
    });

    if (!task) {
      console.error("Task not found:", args.taskId);
      return null;
    }

    try {
      // Build conversation history for the API
      const systemPrompt = `You are a helpful AI assistant continuing a conversation. The user initially asked you to ${task.taskType === "other" ? "help with a task" : task.taskType} some content. Continue helping them with their follow-up questions. Use markdown formatting as appropriate.`;

      // Build messages array with context
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

      // Add original content as first user message
      const initialContent = task.sourceTitle
        ? `Title: ${task.sourceTitle}\n\nContent:\n${task.sourceContent}`
        : task.sourceContent;
      
      if (task.taskType === "other" && task.customInstructions) {
        messages.push({
          role: "user",
          content: `Instructions: ${task.customInstructions}\n\n${initialContent}`,
        });
      } else {
        messages.push({
          role: "user",
          content: `Please ${task.taskType} the following:\n\n${initialContent}`,
        });
      }

      // Add initial result as assistant message
      if (task.result) {
        messages.push({
          role: "assistant",
          content: task.result,
        });
      }

      // Add conversation history
      if (task.messages) {
        for (const msg of task.messages) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Fetch user's API key for the selected provider
      const userApiKey = await ctx.runQuery(internal.userApiKeys.getApiKeyInternal, {
        userId: task.userId,
        provider: task.provider === "claude" ? "anthropic" : "openai",
      });

      let result: string;

      if (task.provider === "claude") {
        result = await processWithClaudeConversation(systemPrompt, messages, userApiKey);
      } else {
        result = await processWithOpenAIConversation(systemPrompt, messages, userApiKey);
      }

      // Append assistant response to messages
      await ctx.runMutation(internal.agentTasks.appendAssistantMessage, {
        taskId: args.taskId,
        content: result,
      });
    } catch (error) {
      console.error("Error processing follow-up:", error);

      await ctx.runMutation(internal.agentTasks.markFollowUpFailed, {
        taskId: args.taskId,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }

    return null;
  },
});

// Process with Claude (Anthropic) - single message
async function processWithClaude(
  systemPrompt: string,
  userMessage: string,
  userApiKey: string | null,
): Promise<string> {
  // User's API key is required
  if (!userApiKey) {
    throw new Error(
      "No Anthropic API key configured. Please add your API key in Settings (press ?)."
    );
  }
  const apiKey = userApiKey;

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  // Extract text from response
  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textContent.text;
}

// Process with Claude (Anthropic) - conversation
async function processWithClaudeConversation(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userApiKey: string | null,
): Promise<string> {
  // User's API key is required
  if (!userApiKey) {
    throw new Error(
      "No Anthropic API key configured. Please add your API key in Settings (press ?)."
    );
  }
  const apiKey = userApiKey;

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages,
  });

  // Extract text from response
  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textContent.text;
}

// Process with OpenAI - single message
async function processWithOpenAI(
  systemPrompt: string,
  userMessage: string,
  userApiKey: string | null,
): Promise<string> {
  // User's API key is required
  if (!userApiKey) {
    throw new Error(
      "No OpenAI API key configured. Please add your API key in Settings (press ?)."
    );
  }
  const apiKey = userApiKey;

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return content;
}

// Process with OpenAI - conversation
async function processWithOpenAIConversation(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userApiKey: string | null,
): Promise<string> {
  // User's API key is required
  if (!userApiKey) {
    throw new Error(
      "No OpenAI API key configured. Please add your API key in Settings (press ?)."
    );
  }
  const apiKey = userApiKey;

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages,
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return content;
}
