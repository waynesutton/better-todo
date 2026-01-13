"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";
import {
  getClaudeTools,
  getOpenAITools,
  EXECUTABLE_NOTE_SYSTEM_PROMPT,
} from "./agentTools";

// System prompts for different task types
const TASK_PROMPTS: Record<string, string> = {
  expand: `You are a helpful assistant that expands on ideas. When given content, research the topic mentally, brainstorm related concepts, and create a detailed plan or elaboration. Be thorough but organized. Use markdown formatting for clarity with headers, lists, and sections as appropriate.`,

  code: `You are an expert programmer. When given a task description, generate clean, well-documented code to implement it. Include comments explaining your approach. If the language isn't specified, use TypeScript/JavaScript. Use markdown code blocks with appropriate language tags. Explain any important decisions or trade-offs.`,

  summarize: `You are a concise summarizer. When given content, extract the key points and organize them into a clear, actionable summary. Use bullet points and short paragraphs. Remove fluff and focus on what matters most. Use markdown formatting.`,

  analyze: `You are a thoughtful analyst. When given content, analyze it critically and provide constructive feedback, suggestions for improvement, potential issues to consider, and alternative approaches. Be specific and actionable. Use markdown formatting with clear sections.`,

  other: `You are a helpful AI assistant. Follow the user's instructions carefully and provide a thorough, well-organized response. Use markdown formatting as appropriate.`,
};

// Process an agent task using Claude or OpenAI with automatic fallback
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
      const systemPrompt = TASK_PROMPTS[task.taskType] || TASK_PROMPTS.expand;

      // Build the user message with context
      let userMessage = task.sourceTitle
        ? `Title: ${task.sourceTitle}\n\nContent:\n${task.sourceContent}`
        : task.sourceContent;

      // For "other" task type, prepend custom instructions
      if (task.taskType === "other" && task.customInstructions) {
        userMessage = `Instructions: ${task.customInstructions}\n\n${userMessage}`;
      }

      // Get available (non-paused) API keys
      const availableKeys = await ctx.runQuery(
        internal.userApiKeys.getAvailableApiKeys,
        {
          userId: task.userId,
        },
      );

      // Determine which provider to use: prefer selected, fallback to other
      const selectedIsAnthopic = task.provider === "claude";
      let useProvider: "anthropic" | "openai" | null = null;
      let apiKey: string | null = null;

      if (selectedIsAnthopic) {
        if (availableKeys.anthropicAvailable) {
          useProvider = "anthropic";
          apiKey = availableKeys.anthropicKey;
        } else if (availableKeys.openaiAvailable) {
          // Fallback to OpenAI
          useProvider = "openai";
          apiKey = availableKeys.openaiKey;
        }
      } else {
        if (availableKeys.openaiAvailable) {
          useProvider = "openai";
          apiKey = availableKeys.openaiKey;
        } else if (availableKeys.anthropicAvailable) {
          // Fallback to Claude
          useProvider = "anthropic";
          apiKey = availableKeys.anthropicKey;
        }
      }

      if (!useProvider || !apiKey) {
        throw new Error(
          "No API key available. Please add or unpause an API key in Settings (press ?).",
        );
      }

      if (useProvider === "anthropic") {
        result = await processWithClaude(systemPrompt, userMessage, apiKey);
      } else {
        result = await processWithOpenAI(systemPrompt, userMessage, apiKey);
      }

      // Update task with result and actual provider used
      await ctx.runMutation(internal.agentTasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "completed",
        result,
        actualProvider: useProvider === "anthropic" ? "claude" : "openai",
      });
    } catch (error) {
      console.error("Error processing agent task:", error);

      // Update task with error
      await ctx.runMutation(internal.agentTasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "failed",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
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
      const messages: Array<{ role: "user" | "assistant"; content: string }> =
        [];

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

      // Get available (non-paused) API keys with fallback
      const availableKeys = await ctx.runQuery(
        internal.userApiKeys.getAvailableApiKeys,
        {
          userId: task.userId,
        },
      );

      const selectedIsAnthopic = task.provider === "claude";
      let useProvider: "anthropic" | "openai" | null = null;
      let apiKey: string | null = null;

      if (selectedIsAnthopic) {
        if (availableKeys.anthropicAvailable) {
          useProvider = "anthropic";
          apiKey = availableKeys.anthropicKey;
        } else if (availableKeys.openaiAvailable) {
          useProvider = "openai";
          apiKey = availableKeys.openaiKey;
        }
      } else {
        if (availableKeys.openaiAvailable) {
          useProvider = "openai";
          apiKey = availableKeys.openaiKey;
        } else if (availableKeys.anthropicAvailable) {
          useProvider = "anthropic";
          apiKey = availableKeys.anthropicKey;
        }
      }

      if (!useProvider || !apiKey) {
        throw new Error(
          "No API key available. Please add or unpause an API key in Settings (press ?).",
        );
      }

      let result: string;

      if (useProvider === "anthropic") {
        result = await processWithClaudeConversation(
          systemPrompt,
          messages,
          apiKey,
        );
      } else {
        result = await processWithOpenAIConversation(
          systemPrompt,
          messages,
          apiKey,
        );
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
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }

    return null;
  },
});

// Process with Claude (Anthropic) - single message
async function processWithClaude(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
): Promise<string> {
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
  apiKey: string,
): Promise<string> {
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
  apiKey: string,
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
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
  apiKey: string,
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
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

// Max iterations for agent loop to prevent runaway execution
const MAX_AGENT_ITERATIONS = 10;

// Type for execution log entries
type ExecutionLogEntry = {
  toolName: string;
  toolInput: string;
  toolResult?: string;
  status: "pending" | "success" | "error";
  timestamp: number;
};

// Process an executable note - runs tools based on note instructions with provider fallback
export const processExecutableNote = internalAction({
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
      // Get available (non-paused) API keys with fallback
      const availableKeys = await ctx.runQuery(
        internal.userApiKeys.getAvailableApiKeys,
        {
          userId: task.userId,
        },
      );

      const selectedIsAnthopic = task.provider === "claude";
      let useProvider: "anthropic" | "openai" | null = null;
      let apiKey: string | null = null;

      if (selectedIsAnthopic) {
        if (availableKeys.anthropicAvailable) {
          useProvider = "anthropic";
          apiKey = availableKeys.anthropicKey;
        } else if (availableKeys.openaiAvailable) {
          useProvider = "openai";
          apiKey = availableKeys.openaiKey;
        }
      } else {
        if (availableKeys.openaiAvailable) {
          useProvider = "openai";
          apiKey = availableKeys.openaiKey;
        } else if (availableKeys.anthropicAvailable) {
          useProvider = "anthropic";
          apiKey = availableKeys.anthropicKey;
        }
      }

      if (!useProvider || !apiKey) {
        throw new Error(
          "No API key available. Please add or unpause an API key in Settings (press ?).",
        );
      }

      // Build system prompt with today's date
      const today = new Date().toISOString().split("T")[0];
      const systemPrompt = EXECUTABLE_NOTE_SYSTEM_PROMPT.replace(
        "{{TODAY_DATE}}",
        today,
      );

      // Build user message
      const userMessage = task.sourceTitle
        ? `Title: ${task.sourceTitle}\n\nInstructions:\n${task.sourceContent}`
        : `Instructions:\n${task.sourceContent}`;

      let finalResult: string;
      const executionLog: ExecutionLogEntry[] = [];

      if (useProvider === "anthropic") {
        finalResult = await runClaudeAgentLoop(
          ctx as unknown as AgentCtx,
          args.taskId,
          task.userId,
          task.date,
          task.folderId,
          systemPrompt,
          userMessage,
          apiKey,
          executionLog,
        );
      } else {
        finalResult = await runOpenAIAgentLoop(
          ctx as unknown as AgentCtx,
          args.taskId,
          task.userId,
          task.date,
          task.folderId,
          systemPrompt,
          userMessage,
          apiKey,
          executionLog,
        );
      }

      // Update task with final result, execution log, and actual provider
      await ctx.runMutation(internal.agentTasks.updateTaskWithExecutionLog, {
        taskId: args.taskId,
        status: "completed",
        result: finalResult,
        executionLog,
        actualProvider: useProvider === "anthropic" ? "claude" : "openai",
      });
    } catch (error) {
      console.error("Error processing executable note:", error);

      await ctx.runMutation(internal.agentTasks.updateTaskStatus, {
        taskId: args.taskId,
        status: "failed",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }

    return null;
  },
});

// Context type for agent loop functions - using any for compatibility with GenericActionCtx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AgentCtx = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runQuery: <T>(fn: any, args: any) => Promise<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runMutation: <T>(fn: any, args: any) => Promise<T>;
};

// Run Claude agent loop with tool use
async function runClaudeAgentLoop(
  ctx: AgentCtx,
  taskId: Id<"agentTasks">,
  userId: string,
  date: string | undefined,
  folderId: Id<"folders"> | undefined,
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  executionLog: ExecutionLogEntry[],
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const tools = getClaudeTools();

  // Build conversation history
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  let finalTextResponse = "";

  while (iterations < MAX_AGENT_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });

    // Check if we have tool use blocks
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    // Collect any text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    if (textBlocks.length > 0) {
      finalTextResponse = textBlocks.map((b) => b.text).join("\n");
    }

    // If no tool calls, we're done
    if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
      break;
    }

    // Process each tool call
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      // Log the tool call as pending
      const logEntry: ExecutionLogEntry = {
        toolName: toolUse.name,
        toolInput: JSON.stringify(toolUse.input),
        status: "pending",
        timestamp: Date.now(),
      };
      executionLog.push(logEntry);

      // Update execution log in real-time
      await ctx.runMutation(internal.agentTasks.appendExecutionLogEntry, {
        taskId,
        entry: logEntry,
      });

      try {
        // Execute the tool
        const result = await executeAgentTool(
          ctx,
          userId,
          date,
          folderId,
          toolUse.name,
          toolUse.input as Record<string, unknown>,
        );

        // Update log entry with result
        logEntry.status = "success";
        logEntry.toolResult = JSON.stringify(result);

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        // Update log entry with error
        logEntry.status = "error";
        logEntry.toolResult =
          error instanceof Error ? error.message : "Unknown error";

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          is_error: true,
        });
      }
    }

    // Add assistant response and tool results to conversation
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return finalTextResponse || "Execution completed.";
}

// Run OpenAI agent loop with function calling
async function runOpenAIAgentLoop(
  ctx: AgentCtx,
  taskId: Id<"agentTasks">,
  userId: string,
  date: string | undefined,
  folderId: Id<"folders"> | undefined,
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  executionLog: ExecutionLogEntry[],
): Promise<string> {
  const openai = new OpenAI({ apiKey });
  const tools = getOpenAITools();

  // Build conversation history
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  let finalTextResponse = "";

  while (iterations < MAX_AGENT_ITERATIONS) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 4096,
      tools,
      messages,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error("No response from OpenAI");
    }

    const message = choice.message;

    // Collect any text response
    if (message.content) {
      finalTextResponse = message.content;
    }

    // If no tool calls, we're done
    if (!message.tool_calls || message.tool_calls.length === 0) {
      break;
    }

    // Add assistant message with tool calls to history
    messages.push(message);

    // Process each tool call
    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Log the tool call as pending
      const logEntry: ExecutionLogEntry = {
        toolName: functionName,
        toolInput: toolCall.function.arguments,
        status: "pending",
        timestamp: Date.now(),
      };
      executionLog.push(logEntry);

      // Update execution log in real-time
      await ctx.runMutation(internal.agentTasks.appendExecutionLogEntry, {
        taskId,
        entry: logEntry,
      });

      try {
        // Execute the tool
        const result = await executeAgentTool(
          ctx,
          userId,
          date,
          folderId,
          functionName,
          functionArgs,
        );

        // Update log entry with result
        logEntry.status = "success";
        logEntry.toolResult = JSON.stringify(result);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        // Update log entry with error
        logEntry.status = "error";
        logEntry.toolResult =
          error instanceof Error ? error.message : "Unknown error";

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }
  }

  return finalTextResponse || "Execution completed.";
}

// Execute an agent tool by calling the appropriate internal mutation
async function executeAgentTool(
  ctx: AgentCtx,
  userId: string,
  date: string | undefined,
  folderId: Id<"folders"> | undefined,
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<unknown> {
  switch (toolName) {
    case "createTodo": {
      const result = await ctx.runMutation(
        internal.agentToolMutations.agentCreateTodo,
        {
          userId,
          content: toolInput.content as string,
          date: (toolInput.date as string) || date,
          folderId,
          pinned: toolInput.pinned === "true",
        },
      );
      return result;
    }

    case "updateTodo": {
      const result = await ctx.runMutation(
        internal.agentToolMutations.agentUpdateTodo,
        {
          userId,
          todoId: toolInput.todoId as Id<"todos">,
          content: toolInput.content as string | undefined,
          pinned:
            toolInput.pinned === "true"
              ? true
              : toolInput.pinned === "false"
                ? false
                : undefined,
        },
      );
      return result;
    }

    case "completeTodo": {
      const result = await ctx.runMutation(
        internal.agentToolMutations.agentCompleteTodo,
        {
          userId,
          todoId: toolInput.todoId as Id<"todos">,
        },
      );
      return result;
    }

    case "deleteTodo": {
      const result = await ctx.runMutation(
        internal.agentToolMutations.agentDeleteTodo,
        {
          userId,
          todoId: toolInput.todoId as Id<"todos">,
        },
      );
      return result;
    }

    case "createNote": {
      const result = await ctx.runMutation(
        internal.agentToolMutations.agentCreateNote,
        {
          userId,
          title: toolInput.title as string | undefined,
          content: toolInput.content as string,
          date: (toolInput.date as string) || date,
          folderId,
        },
      );
      return result;
    }

    case "updateNote": {
      const result = await ctx.runMutation(
        internal.agentToolMutations.agentUpdateNote,
        {
          userId,
          noteId: toolInput.noteId as Id<"fullPageNotes">,
          title: toolInput.title as string | undefined,
          content: toolInput.content as string | undefined,
        },
      );
      return result;
    }

    case "moveTodosToDate": {
      const todoIdsStr = toolInput.todoIds as string;
      const todoIds = todoIdsStr
        .split(",")
        .map((id) => id.trim()) as Id<"todos">[];
      const result = await ctx.runMutation(
        internal.agentToolMutations.agentMoveTodosToDate,
        {
          userId,
          todoIds,
          targetDate: toolInput.targetDate as string,
        },
      );
      return result;
    }

    case "searchTodos": {
      const result = await ctx.runQuery(
        internal.agentToolMutations.agentSearchTodos,
        {
          userId,
          query: toolInput.query as string,
          date: toolInput.date as string | undefined,
          includeCompleted: toolInput.includeCompleted === "true",
        },
      );
      return result;
    }

    case "searchNotes": {
      const result = await ctx.runQuery(
        internal.agentToolMutations.agentSearchNotes,
        {
          userId,
          query: toolInput.query as string,
        },
      );
      return result;
    }

    case "getTodosForDate": {
      const result = await ctx.runQuery(
        internal.agentToolMutations.agentGetTodosForDate,
        {
          userId,
          date: toolInput.date as string,
          includeCompleted: toolInput.includeCompleted === "true",
        },
      );
      return result;
    }

    case "archiveDate": {
      const result = await ctx.runMutation(
        internal.agentToolMutations.agentArchiveDate,
        {
          userId,
          date: toolInput.date as string,
        },
      );
      return result;
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
