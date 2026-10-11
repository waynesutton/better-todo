import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import mcp from "@convex-dev/mcp/convex.config.js";

const app = defineApp();
app.use(agent);
// MCP server + OAuth for connected AI agents. Serves /mcp and /.well-known/*
// from the origin root, so the app must not set an httpPrefix.
app.use(mcp);

export default app;
