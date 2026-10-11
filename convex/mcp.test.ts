/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import mcpTest from "@convex-dev/mcp/test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { mcp } from "./mcp";
import { todayFor } from "./lib/time";

const modules = import.meta.glob("./**/*.ts");

const USER_A = "test-user-a";
const USER_B = "test-user-b";

function setup() {
  process.env.CONVEX_SITE_URL = "https://test.convex.site";
  const t = convexTest(schema, modules);
  mcpTest.register(t);
  return t;
}

type T = ReturnType<typeof setup>;

// Fields the tests read from tool results
type ToolData = {
  status?: string;
  content?: string;
  candidates?: Array<unknown>;
};

async function mintKey(t: T, userId: string, scopes?: Array<string>) {
  const { apiKey } = await t.action(internal.mcp.createApiKeyForUser, {
    userId,
    name: "test",
    ...(scopes ? { scopes } : {}),
  });
  return apiKey;
}

async function callTool(t: T, key: string, name: string, args: Record<string, unknown>) {
  const res = await t.fetch("/mcp", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return {
    status: res.status,
    isError: Boolean(body?.result?.isError || body?.error),
    data: body?.result?.structuredContent as ToolData | undefined,
    text: (body?.result?.content?.[0]?.text as string | undefined) ?? "",
  };
}

async function seedTodo(t: T, userId: string, content: string, date = "2026-10-10") {
  return t.run((ctx) =>
    ctx.db.insert("todos", {
      userId,
      date,
      content,
      type: "todo",
      completed: false,
      archived: false,
      order: Date.now(),
      collapsed: false,
    }),
  );
}

async function activityCount(t: T, userId: string) {
  return t.run(async (ctx) => {
    const rows = await ctx.db
      .query("mcpActivity")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
      .collect();
    return rows.length;
  });
}

beforeEach(() => {
  delete process.env.TYPESAFE_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mcp server", () => {
  test("lint finds no risky tool setups", () => {
    expect(mcp.lint()).toEqual([]);
  });

  test("todayFor uses the user's timezone around midnight", () => {
    // 2026-03-10 06:59 UTC is still Mar 9 in Los Angeles (PDT, UTC-7)
    expect(todayFor("America/Los_Angeles", Date.UTC(2026, 2, 10, 6, 59))).toBe("2026-03-09");
    expect(todayFor("America/Los_Angeles", Date.UTC(2026, 2, 10, 7, 30))).toBe("2026-03-10");
    // Bad timezone falls back to the default instead of throwing
    expect(todayFor("Not/AZone", Date.UTC(2026, 2, 10, 6, 59))).toBe("2026-03-09");
  });

  test("add_todo writes for the key's user and logs one activity row", async () => {
    const t = setup();
    const keyA = await mintKey(t, USER_A);

    const res = await callTool(t, keyA, "add_todo", { content: "Call Jamie", date: "2026-10-10" });
    expect(res.isError).toBe(false);
    expect(res.data?.content).toBe("Call Jamie");

    const todos = await t.run((ctx) =>
      ctx.db
        .query("todos")
        .withIndex("by_user_and_date", (q) => q.eq("userId", USER_A).eq("date", "2026-10-10"))
        .collect(),
    );
    expect(todos).toHaveLength(1);
    expect(await activityCount(t, USER_A)).toBe(1);
    expect(await activityCount(t, USER_B)).toBe(0);
  });

  test("a user's key can't touch another user's todo or note", async () => {
    const t = setup();
    const keyA = await mintKey(t, USER_A);
    const todoB = await seedTodo(t, USER_B, "B's secret todo");
    const noteB = await t.run((ctx) =>
      ctx.db.insert("notes", { userId: USER_B, date: "2026-10-10", title: "B", content: "secret" }),
    );

    const complete = await callTool(t, keyA, "complete_todo", { id: todoB });
    expect(complete.isError).toBe(true);
    const read = await callTool(t, keyA, "get_note", { id: noteB });
    expect(read.isError).toBe(true);
    expect(read.text).not.toContain("secret");

    const todo = await t.run((ctx) => ctx.db.get(todoB));
    expect(todo?.completed).toBe(false);
    expect(await activityCount(t, USER_A)).toBe(0);
  });

  test("a read-only key can't call write tools", async () => {
    const t = setup();
    const readKey = await mintKey(t, USER_A, ["todos:read"]);
    const res = await callTool(t, readKey, "add_todo", { content: "nope" });
    expect(res.status).toBe(403);
    expect(await activityCount(t, USER_A)).toBe(0);
  });

  test("ambiguous match returns candidates and changes nothing", async () => {
    const t = setup();
    const keyA = await mintKey(t, USER_A);
    await seedTodo(t, USER_A, "Call Jamie");
    await seedTodo(t, USER_A, "call jamie");

    const res = await callTool(t, keyA, "complete_todo", { match: "Call Jamie" });
    expect(res.isError).toBe(false);
    expect(res.data?.status).toBe("ambiguous");
    expect(res.data?.candidates).toHaveLength(2);
    expect(await activityCount(t, USER_A)).toBe(0);
  });

  test("activity is only visible to its owner", async () => {
    const t = setup();
    const keyA = await mintKey(t, USER_A);
    await callTool(t, keyA, "add_todo", { content: "Ship MCP" });

    const asA = await t.withIdentity({ subject: USER_A }).query(api.mcpActivity.listMyAgentActivity, {});
    const asB = await t.withIdentity({ subject: USER_B }).query(api.mcpActivity.listMyAgentActivity, {});
    expect(asA).toHaveLength(1);
    expect(asB).toHaveLength(0);
  });
});

describe("smart matching", () => {
  // Fake TypeSafe: put `topProb` on the first option, the rest on none_of_these
  function stubTypesafe(topProb: number | "error") {
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (!url.includes("api.typesafe.ai")) return realFetch(input, init);
      if (topProb === "error") return new Response("down", { status: 529 });
      return new Response(
        JSON.stringify({
          answers: {
            target: {
              type: "choice",
              choice: topProb >= 0.5 ? "c0" : "none_of_these",
              probabilities: { c0: topProb, none_of_these: 1 - topProb },
              confidence: topProb,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
  }

  async function seedTwo(t: T) {
    await seedTodo(t, USER_A, "Email the landlord about the lease");
    await seedTodo(t, USER_A, "Buy groceries");
  }

  test("confident pick completes the todo and is tagged as matched", async () => {
    process.env.TYPESAFE_API_KEY = "test";
    stubTypesafe(0.95);
    const t = setup();
    const keyA = await mintKey(t, USER_A);
    await seedTwo(t);

    const res = await callTool(t, keyA, "complete_todo", { match: "rent thing" });
    expect(res.data?.status).toBe("completed");
    const rows = await t.run((ctx) =>
      ctx.db
        .query("mcpActivity")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", USER_A))
        .take(10),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].matchConfidence).toBeGreaterThanOrEqual(0.85);
  });

  test("low confidence returns ranked candidates and writes nothing", async () => {
    process.env.TYPESAFE_API_KEY = "test";
    stubTypesafe(0.6);
    const t = setup();
    const keyA = await mintKey(t, USER_A);
    await seedTwo(t);

    const res = await callTool(t, keyA, "complete_todo", { match: "rent thing" });
    expect(res.data?.status).toBe("ambiguous");
    expect(res.data?.candidates?.length).toBeGreaterThan(0);
    expect(await activityCount(t, USER_A)).toBe(0);
  });

  test("TypeSafe errors and a missing key fall back safely", async () => {
    process.env.TYPESAFE_API_KEY = "test";
    stubTypesafe("error");
    const t = setup();
    const keyA = await mintKey(t, USER_A);
    await seedTwo(t);

    const failed = await callTool(t, keyA, "complete_todo", { match: "rent thing" });
    expect(failed.data?.status).toBe("ambiguous");

    delete process.env.TYPESAFE_API_KEY;
    const noKey = await callTool(t, keyA, "complete_todo", { match: "rent thing" });
    expect(noKey.data?.status).toBe("ambiguous");
    expect(await activityCount(t, USER_A)).toBe(0);
  });
});
