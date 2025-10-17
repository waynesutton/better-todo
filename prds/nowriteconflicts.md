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

## Summary

**Key Takeaway:** The less you read before writing, the fewer conflicts you'll have. Design your mutations to write directly when possible, and structure your data model to avoid concurrent writes to the same documents.
