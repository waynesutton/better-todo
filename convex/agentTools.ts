// Tool definitions for executable notes agent
// Supports both Claude (tool_use) and OpenAI (function_calling) formats

import { Anthropic } from "@anthropic-ai/sdk";

// Type for tool input schemas
type ToolInputSchema = {
  type: "object";
  properties: Record<string, { type: string; description: string; enum?: string[] }>;
  required: string[];
};

// Tool definition interface
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

// All available tools for the executable notes agent
export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "createTodo",
    description: "Create a new todo item. Use this to add tasks or action items.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The text content of the todo item",
        },
        date: {
          type: "string",
          description: "The date for the todo in YYYY-MM-DD format. Defaults to today if not specified.",
        },
        pinned: {
          type: "string",
          description: "Whether to pin this todo to the top. Use 'true' or 'false'.",
          enum: ["true", "false"],
        },
      },
      required: ["content"],
    },
  },
  {
    name: "updateTodo",
    description: "Update an existing todo item's content or properties.",
    inputSchema: {
      type: "object",
      properties: {
        todoId: {
          type: "string",
          description: "The ID of the todo to update",
        },
        content: {
          type: "string",
          description: "New text content for the todo",
        },
        pinned: {
          type: "string",
          description: "Whether to pin this todo. Use 'true' or 'false'.",
          enum: ["true", "false"],
        },
      },
      required: ["todoId"],
    },
  },
  {
    name: "completeTodo",
    description: "Mark a todo as completed (checked off).",
    inputSchema: {
      type: "object",
      properties: {
        todoId: {
          type: "string",
          description: "The ID of the todo to complete",
        },
      },
      required: ["todoId"],
    },
  },
  {
    name: "deleteTodo",
    description: "Delete a todo item permanently.",
    inputSchema: {
      type: "object",
      properties: {
        todoId: {
          type: "string",
          description: "The ID of the todo to delete",
        },
      },
      required: ["todoId"],
    },
  },
  {
    name: "createNote",
    description: "Create a new full-page note with markdown content.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title of the note",
        },
        content: {
          type: "string",
          description: "The markdown content of the note",
        },
        date: {
          type: "string",
          description: "The date for the note in YYYY-MM-DD format. Defaults to today if not specified.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "updateNote",
    description: "Update an existing note's title or content.",
    inputSchema: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "The ID of the note to update",
        },
        title: {
          type: "string",
          description: "New title for the note",
        },
        content: {
          type: "string",
          description: "New markdown content for the note",
        },
      },
      required: ["noteId"],
    },
  },
  {
    name: "moveTodosToDate",
    description: "Move one or more todos to a different date.",
    inputSchema: {
      type: "object",
      properties: {
        todoIds: {
          type: "string",
          description: "Comma-separated list of todo IDs to move",
        },
        targetDate: {
          type: "string",
          description: "The target date in YYYY-MM-DD format",
        },
      },
      required: ["todoIds", "targetDate"],
    },
  },
  {
    name: "searchTodos",
    description: "Search for todos by content. Returns matching todos with their IDs.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to find in todo content",
        },
        date: {
          type: "string",
          description: "Optional: limit search to a specific date (YYYY-MM-DD)",
        },
        includeCompleted: {
          type: "string",
          description: "Whether to include completed todos. Use 'true' or 'false'. Defaults to 'false'.",
          enum: ["true", "false"],
        },
      },
      required: ["query"],
    },
  },
  {
    name: "searchNotes",
    description: "Search for notes by title or content. Returns matching notes with their IDs.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to find in note title or content",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "getTodosForDate",
    description: "Get all todos for a specific date. Useful for understanding what tasks exist.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date to get todos for in YYYY-MM-DD format",
        },
        includeCompleted: {
          type: "string",
          description: "Whether to include completed todos. Use 'true' or 'false'. Defaults to 'false'.",
          enum: ["true", "false"],
        },
      },
      required: ["date"],
    },
  },
  {
    name: "archiveDate",
    description: "Archive all todos for a specific date.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date to archive in YYYY-MM-DD format",
        },
      },
      required: ["date"],
    },
  },
];

// Convert tool definitions to Claude format
export function getClaudeTools(): Anthropic.Tool[] {
  return AGENT_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Tool["input_schema"],
  }));
}

// Convert tool definitions to OpenAI format
export function getOpenAITools(): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: ToolInputSchema;
  };
}> {
  return AGENT_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

// System prompt for executable notes
export const EXECUTABLE_NOTE_SYSTEM_PROMPT = `You are an AI agent that executes instructions written in plain English. The user has written a note containing instructions, and your job is to execute those instructions by calling the appropriate tools.

Guidelines:
1. Read the instructions carefully and identify all actionable tasks
2. Execute each task by calling the appropriate tool
3. If you need to reference existing todos or notes, search for them first
4. Create todos for any action items mentioned
5. Create notes for any documentation or content that should be saved
6. If a date is mentioned (like "tomorrow", "next week", "Monday"), convert it to YYYY-MM-DD format
7. If no date is specified, use today's date
8. After executing all instructions, provide a brief summary of what you did

Today's date is: {{TODAY_DATE}}

Execute the instructions in the note below.`;
