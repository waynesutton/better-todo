# Avoiding Write Conflicts in Convex

## What are Write Conflicts?

Write conflicts occur when two functions running in parallel make conflicting changes to the same document or table. Convex uses Optimistic Concurrency Control (OCC), which means if a mutation reads a document and then tries to write to it, but another mutation modified that document in the meantime, the first mutation will fail and retry.

If conflicts persist across multiple retries, the mutation will eventually fail permanently with error code 1.

## Common Causes of Write Conflicts

### 1. Reading Before Writing (Most Common)

**Bad Pattern:**

```typescript
export const updateNote = mutation({
  args: { id: v.id("notes"), content: v.string() },
  handler: async (ctx, args) => {
    // Reading the document first
    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Not found");

    // Then writing creates a conflict window
    await ctx.db.patch(args.id, { content: args.content });
  },
});
```

**Why It Fails:**
When typing rapidly, multiple mutations fire. Each reads the same version, then all try to write, causing conflicts.

**Good Pattern:**

```typescript
export const updateNote = mutation({
  args: { id: v.id("notes"), content: v.string() },
  handler: async (ctx, args) => {
    // Patch directly without reading first
    // ctx.db.patch throws if document doesn't exist
    await ctx.db.patch(args.id, { content: args.content });
  },
});
```

### 2. Sequential Writes in Loops

**Bad Pattern:**

```typescript
export const reorderItems = mutation({
  args: { itemIds: v.array(v.id("items")) },
  handler: async (ctx, args) => {
    for (let i = 0; i < args.itemIds.length; i++) {
      const item = await ctx.db.get(args.itemIds[i]); // Read
      await ctx.db.patch(args.itemIds[i], { order: i }); // Write
    }
  },
});
```

**Good Pattern:**

```typescript
export const reorderItems = mutation({
  args: { itemIds: v.array(v.id("items")) },
  handler: async (ctx, args) => {
    // Patch all items in parallel
    const updates = args.itemIds.map((id, index) =>
      ctx.db.patch(id, { order: index }),
    );
    await Promise.all(updates);
  },
});
```

### 3. Reading Entire Tables for Calculations

**Bad Pattern:**

```typescript
export const updateCounter = mutation({
  args: {},
  handler: async (ctx) => {
    // Every call reads the entire table
    const allItems = await ctx.db.query("items").collect();
    const count = allItems.length;

    // Multiple parallel calls conflict on this write
    await ctx.db.patch(COUNTER_ID, { count });
  },
});
```

**Good Pattern:**

```typescript
// Use aggregation tables with separate documents
export const incrementCounter = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Each user has their own counter document
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (counter) {
      await ctx.db.patch(counter._id, {
        count: counter.count + 1,
      });
    }
  },
});
```

### 4. High-Frequency Updates to Same Document

**Bad Pattern:**

```typescript
// Global counter updated by all users
export const trackView = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    await ctx.db.patch(args.pageId, {
      views: page.views + 1,
    });
  },
});
```

**Good Pattern:**

```typescript
// Separate view tracking documents
export const trackView = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    // Create individual view records instead
    await ctx.db.insert("views", {
      pageId: args.pageId,
      timestamp: Date.now(),
    });
    // Aggregate views in a query or scheduled function
  },
});
```

## Best Practices

### 1. Only Read What You Need

Use indexed queries with selective filters instead of reading entire tables.

### 2. Avoid Unnecessary Reads

If you're just updating fields, patch directly. The database operations (`patch`, `replace`, `delete`) will throw if the document doesn't exist.

### 3. Batch Operations in Parallel

Use `Promise.all()` for independent writes instead of sequential loops.

### 4. Design for Concurrency

Structure your data model to avoid hot spots (documents that many users write to simultaneously).

### 5. Use Separate Documents for High-Frequency Writes

Instead of updating a counter on a document, create individual event records and aggregate them in queries.

### 6. Debounce Rapid Client Updates

For text inputs, debounce updates (300-500ms) to reduce mutation frequency:

```typescript
const debouncedUpdate = useCallback(
  debounce((id, content) => {
    updateNote({ id, content });
  }, 500),
  [],
);
```

## When Authorization Checks Are Needed

If you need to verify ownership before updates:

**Option A: Use indexes for user-scoped queries**

```typescript
export const updateNote = mutation({
  args: {
    id: v.id("notes"),
    userId: v.string(), // From auth
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Only query notes the user owns
    const note = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("_id"), args.id))
      .unique();

    if (!note) throw new Error("Not found");
    await ctx.db.patch(args.id, { content: args.content });
  },
});
```

**Option B: Schema-level security with internal mutations**

```typescript
// Internal mutation with no auth check
export const _updateNote = internalMutation({
  args: { id: v.id("notes"), content: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { content: args.content });
  },
});

// Public mutation with auth check
export const updateNote = mutation({
  args: { id: v.id("notes"), content: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== identity.subject) {
      throw new Error("Not found");
    }

    // Call internal mutation
    await ctx.runMutation(internal.notes._updateNote, {
      id: args.id,
      content: args.content,
    });
  },
});
```

## Monitoring Write Conflicts

Check your Convex dashboard for:

- **Insight Breakdown**: Shows which mutations are retrying due to conflicts
- **Error Logs**: Permanent failures after retries
- **Function Latency**: High latency may indicate frequent retries

## Resources

- [Convex Error Documentation](https://docs.convex.dev/error#1)
- [Optimistic Concurrency Control](https://docs.convex.dev/database/advanced/occ)
- [Best Practices: TypeScript](https://docs.convex.dev/understanding/best-practices/typescript)
- [Mutation Functions](https://docs.convex.dev/functions/mutation-functions)
- [Query Functions](https://docs.convex.dev/functions/query-functions)

## Real-World Fixes Applied to Better Todo

### Write Conflicts Fixed (November 2025)

The following mutations were causing write conflicts and have been fixed:

#### 1. `todos:createTodo` - Fixed timestamp-based ordering

**Problem:** Reading all existing todos to calculate max order caused conflicts when creating multiple todos rapidly.

**Solution:** Changed to timestamp-based ordering using `Date.now()` instead of reading all todos.

```typescript
// Before: Read all todos to find max order
const existingTodos = await ctx.db
  .query("todos")
  .withIndex("by_user_and_date", (q) =>
    q.eq("userId", userId).eq("date", args.date),
  )
  .collect();
const maxOrder =
  existingTodos.length > 0
    ? Math.max(...existingTodos.map((t) => t.order))
    : -1;

// After: Use timestamp for ordering (no reads needed)
const order = Date.now();
```

**Reference:** [Convex Error Documentation - Write Conflicts](https://docs.convex.dev/error#1)

#### 2. `todos:deleteTodo` - Fixed with indexed queries and parallel deletes

**Problem:** Using `ctx.db.get()` before deleting created a conflict window.

**Solution:** Use indexed query to verify ownership, then delete subtasks in parallel.

```typescript
// Before: Read document first
const todo = await ctx.db.get(args.id);
if (!todo || todo.userId !== userId) {
  throw new Error("Not authorized");
}
await ctx.db.delete(args.id);

// After: Use indexed query + parallel deletes
const todo = await ctx.db
  .query("todos")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .filter((q) => q.eq(q.field("_id"), args.id))
  .unique();

if (!todo) return null; // Idempotent

// Delete subtasks in parallel
await Promise.all(subtasks.map((subtask) => ctx.db.delete(subtask._id)));
await ctx.db.delete(args.id);
```

**Reference:** [Convex Best Practices - Minimize Data Reads](https://docs.convex.dev/understanding/best-practices/)

#### 3. `pomodoro:completePomodoro` - Fixed with indexed queries

**Problem:** Using `ctx.db.get()` before patching caused conflicts.

**Solution:** Use indexed query to check ownership and status in one operation.

```typescript
// Before: Read document first
const session = await ctx.db.get(args.sessionId);
if (!session || session.status === "completed") {
  return null;
}
await ctx.db.patch(args.sessionId, { status: "completed" });

// After: Use indexed query for ownership + status check
const session = await ctx.db
  .query("pomodoroSessions")
  .withIndex("by_user", (q) =>
    userId ? q.eq("userId", userId) : q.eq("userId", undefined),
  )
  .filter((q) => q.eq(q.field("_id"), args.sessionId))
  .unique();

if (!session || session.status === "completed") {
  return null; // Idempotent
}
await ctx.db.patch(args.sessionId, { status: "completed" });
```

**Reference:** [Convex Query Functions - Indexed Queries](https://docs.convex.dev/functions/query-functions)

#### 4. `pomodoro:updateBackgroundImage` - Fixed with idempotent checks

**Problem:** Reading before patching without checking if value changed.

**Solution:** Add idempotent check - only update if imageUrl is different.

```typescript
// Before: Always patch even if value unchanged
const session = await ctx.db.get(args.sessionId);
if (!session) return null;
await ctx.db.patch(args.sessionId, { backgroundImageUrl: args.imageUrl });

// After: Check if value changed (idempotent)
const session = await ctx.db
  .query("pomodoroSessions")
  .withIndex("by_user", (q) =>
    userId ? q.eq("userId", userId) : q.eq("userId", undefined),
  )
  .filter((q) => q.eq(q.field("_id"), args.sessionId))
  .unique();

if (!session || session.backgroundImageUrl === args.imageUrl) {
  return null; // Idempotent - no change needed
}
await ctx.db.patch(args.sessionId, { backgroundImageUrl: args.imageUrl });
```

**Reference:** [Convex Best Practices - Idempotent Mutations](https://docs.convex.dev/understanding/best-practices/)

### Additional Proactive Fixes

Similar patterns were fixed across the codebase:

- **`notes:createNote`** - Timestamp-based ordering
- **`notes:deleteNote`** - Indexed query without `ctx.db.get()`
- **`folders:createFolder`** - Timestamp-based ordering
- **`folders:renameFolder`** - Indexed query + idempotent check
- **`folders:archiveFolder`** - Indexed query + parallel updates
- **`folders:unarchiveFolder`** - Indexed query + parallel updates
- **`folders:deleteFolder`** - Parallel deletes with `Promise.all()`
- **`folders:addDateToFolder`** - Idempotent check for existing associations
- **`fullPageNotes:createFullPageNote`** - Timestamp-based ordering
- **`fullPageNotes:deleteFullPageNote`** - Indexed query without `ctx.db.get()`
- **`fullPageNotes:moveFullPageNoteToFolder`** - Idempotent check for same folder
- **`fullPageNotes:moveFullPageNoteToDate`** - Idempotent check for same date

### Statistics Tracking Fix

**Problem:** Pomodoro session counting was tracking all sessions instead of only when sessions start.

**Solution:** Added global counter in `statistics` table that increments when `startPomodoro` is called.

```typescript
// In startPomodoro mutation
const stat = await ctx.db
  .query("statistics")
  .withIndex("by_key", (q) => q.eq("key", "pomodoroSessionsStarted"))
  .unique();

if (stat) {
  await ctx.db.patch(stat._id, { value: stat.value + 1 });
} else {
  await ctx.db.insert("statistics", {
    key: "pomodoroSessionsStarted",
    value: 1,
  });
}
```

**Reference:** [Convex Best Practices - Event Records Pattern](https://docs.convex.dev/understanding/best-practices/)

## Key Takeaways for Future Features

### Always Follow These Patterns:

1. **Patch directly without reading first** - Use `ctx.db.patch()` directly. It throws if document doesn't exist.
2. **Use indexed queries for ownership checks** - Don't use `ctx.db.get()` when you can use indexed queries.
3. **Make mutations idempotent** - Check if update is needed before patching (early return if no change).
4. **Use timestamp-based ordering** - For new items, use `Date.now()` instead of reading all items to find max order.
5. **Parallel independent operations** - Use `Promise.all()` for multiple independent writes.
6. **Use event records for counters** - Track events in separate documents, aggregate in queries.

### What to Avoid:

- ❌ Reading entire tables to calculate max order
- ❌ Using `ctx.db.get()` before `ctx.db.patch()` when ownership can be verified via indexed query
- ❌ Sequential loops for independent operations (use `Promise.all()`)
- ❌ Updating counters on shared documents (use event records instead)
- ❌ Patching without checking if value changed (not idempotent)

### Monitoring Write Conflicts

Check your Convex dashboard regularly for:

- **Health / Insights** - Shows retries due to write conflicts
- **Error Logs** - Permanent failures after retries
- **Function Latency** - High latency may indicate frequent retries

**Reference:** [Convex Dashboard - Monitoring](https://dashboard.convex.dev)

## Summary

**Key Takeaway:** The less you read before writing, the fewer conflicts you'll have. Design your mutations to write directly when possible, and structure your data model to avoid concurrent writes to the same documents.

**Single-Line Prompt for Cursor Models:**
When creating Convex mutations, always patch directly without reading first, use indexed queries for ownership checks instead of `ctx.db.get()`, make mutations idempotent with early returns, use timestamp-based ordering for new items, and use `Promise.all()` for parallel independent operations to avoid write conflicts.
