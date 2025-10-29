# Daily Todo Summary Email Implementation

**Status**: Implementation guide for Better Todo app

## Overview

This PRD provides a comprehensive guide for implementing daily email summaries for Better Todo users using the Convex Resend component. The system will send personalized daily emails to each user containing their todo completion statistics and upcoming tasks.

## Requirements

### Email Content

Each daily email will include:

1. **Completed Todos Count**: Total number of todos completed to date
2. **Today's Unchecked Todos**: Number of unchecked todos scheduled for the current day
3. **Top 3 Pinned Todos**: List of the three most recent pinned todos that are not completed (only if user has pinned todos)
4. **Completed Pomodoros**: Total number of Pomodoro timer sessions completed to date

### Technical Requirements

- Use Convex Resend component for email delivery
- Use Convex cron jobs for daily scheduling
- Fully type-safe implementation with Convex validators
- Email sending should only occur for authenticated users
- Handle users who have no todos gracefully
- Support unsubscribing functionality

## Implementation

### Phase 1: Dependencies and Configuration

#### 1.1 Install Resend Component

```bash
npm install @convex-dev/resend
```

#### 1.2 Convex Configuration

**File: `convex/convex.config.ts`**

```typescript
import { defineApp } from "convex/server";
import resend from "@convex-dev/resend/convex.config";

const app = defineApp();
app.use(resend);

export default app;
```

#### 1.3 Environment Variables

Add the following environment variables to your Convex deployment:

```bash
# Resend API Key
RESEND_API_KEY=re_xxxxxxxxx

# Email Configuration
EMAIL_FROM_ADDRESS=updates@yourdomain.com
EMAIL_FROM_NAME=Better Todo
```

### Phase 2: Database Schema Extensions

#### 2.1 Email Tracking Table

**Add to `convex/schema.ts`:**

```typescript
// Email send tracking to prevent duplicates
emailSends: defineTable({
  userId: v.string(),
  emailType: v.literal("daily_summary"),
  sentDate: v.string(), // Format: YYYY-MM-DD
  sentAt: v.number(),
  emailCount: v.number(), // Number of todos in email
}).index("by_user_and_date", ["userId", "sentDate"]),

// Email preferences per user
emailPreferences: defineTable({
  userId: v.string(),
  dailySummaryEnabled: v.boolean(),
  unsubscribedAt: v.optional(v.number()),
}).index("by_user", ["userId"]),
```

### Phase 3: Core Email Infrastructure

#### 3.1 Resend Instance Setup

**File: `convex/emails/resend.ts`**

```typescript
import { components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";

export const resend: Resend = new Resend(components.resend, {
  testMode: process.env.NODE_ENV === "development",
});
```

#### 3.2 Email Template Generator

**File: `convex/emails/templates.ts`**

```typescript
import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const generateDailySummaryEmail = internalQuery({
  args: {
    userName: v.string(),
    completedCount: v.number(),
    todaysUncheckedCount: v.number(),
    pinnedTodos: v.array(
      v.object({
        content: v.string(),
        date: v.string(),
      }),
    ),
    completedPomodoros: v.number(),
  },
  returns: v.object({
    subject: v.string(),
    html: v.string(),
  }),
  handler: async (ctx, args) => {
    const subject = `Your Daily Todo Summary - ${args.completedCount} Completed`;

    const pinnedSection =
      args.pinnedTodos.length > 0
        ? `
        <div style="margin: 30px 0;">
          <h2 style="color: #0076C6; font-size: 18px; margin-bottom: 15px;">
            Top Pinned Todos
          </h2>
          <ul style="list-style: none; padding: 0;">
            ${args.pinnedTodos
              .map(
                (todo) => `
              <li style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                <div style="font-weight: 500; margin-bottom: 5px;">${todo.content}</div>
                <div style="font-size: 12px; color: #666;">${todo.date}</div>
              </li>
            `,
              )
              .join("")}
          </ul>
        </div>
      `
        : "";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Daily Todo Summary</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0076C6 0%, #4a9eff 100%); padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Better Todo</h1>
          </div>

          <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">
            Hello ${args.userName}!
          </h2>

          <p style="font-size: 16px; color: #666; margin-bottom: 30px;">
            Here's your daily todo summary:
          </p>

          <div style="background: #f5f5f7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <div style="margin-bottom: 15px;">
              <div style="font-size: 48px; font-weight: bold; color: #27A561; margin-bottom: 5px;">
                ${args.completedCount}
              </div>
              <div style="font-size: 14px; color: #666;">Todos Completed</div>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
              <div style="font-size: 48px; font-weight: bold; color: #EB5601; margin-bottom: 5px;">
                ${args.completedPomodoros}
              </div>
              <div style="font-size: 14px; color: #666;">Pomodoros Completed</div>
            </div>
          </div>

          ${
            todaysUncheckedCount > 0
              ? `
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #EB5601;">
                <div style="font-size: 32px; font-weight: bold; color: #EB5601; margin-bottom: 5px;">
                  ${args.todaysUncheckedCount}
                </div>
                <div style="font-size: 14px; color: #666;">Unchecked Todos Today</div>
              </div>
            `
              : ""
          }

          ${pinnedSection}

          <div style="margin-top: 40px; text-align: center;">
            <a href="https://better-todo.netlify.app" 
               style="background-color: #0076C6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              Open Better Todo
            </a>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="font-size: 12px; color: #999;">
              <a href="https://better-todo.netlify.app/unsubscribe" style="color: #999;">Unsubscribe from daily emails</a>
            </p>
          </div>
        </body>
      </html>
    `;

    return { subject, html };
  },
});
```

### Phase 4: Data Retrieval Functions

#### 4.1 User Data Query

**File: `convex/emails/queries.ts`**

```typescript
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const getAllUsers = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      userId: v.string(),
      email: v.string(),
      firstName: v.string(),
      lastName: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }));
  },
});

export const getUserEmailPreferences = internalQuery({
  args: {
    userId: v.string(),
  },
  returns: v.union(
    v.object({
      dailySummaryEnabled: v.boolean(),
      unsubscribedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("emailPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!prefs) {
      return null;
    }

    return {
      dailySummaryEnabled: prefs.dailySummaryEnabled,
      unsubscribedAt: prefs.unsubscribedAt,
    };
  },
});

export const getCompletedTodoCount = internalQuery({
  args: {
    userId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("completed"), true))
      .collect();

    return todos.length;
  },
});

export const getTodaysUncheckedCount = internalQuery({
  args: {
    userId: v.string(),
    date: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), false),
          q.eq(q.field("archived"), false),
        ),
      )
      .collect();

    // Filter out backlog todos
    const filteredTodos = todos.filter((todo) => !todo.backlog);

    return filteredTodos.length;
  },
});

export const getPinnedTodos = internalQuery({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      content: v.string(),
      date: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_and_pinned", (q) =>
        q.eq("userId", args.userId).eq("pinned", true),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), false),
          q.eq(q.field("archived"), false),
        ),
      )
      .order("desc")
      .take(3);

    return todos.map((todo) => ({
      content: todo.content,
      date: todo.date,
    }));
  },
});

export const getCompletedPomodoroCount = internalQuery({
  args: {
    userId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("pomodoroSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    return sessions.length;
  },
});

export const hasEmailBeenSentToday = internalQuery({
  args: {
    userId: v.string(),
    date: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailSends")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("sentDate", args.date),
      )
      .first();

    return existing !== null;
  },
});
```

### Phase 5: Email Sending Action

#### 5.1 Send Email Action

**File: `convex/emails/send.ts`**

```typescript
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { resend } from "./resend";

export const sendDailySummaryEmail = internalAction({
  args: {
    userId: v.string(),
    email: v.string(),
    userName: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Check if email already sent today
      const alreadySent = await ctx.runQuery(
        internal.emails.queries.hasEmailBeenSentToday,
        {
          userId: args.userId,
          date: today,
        },
      );

      if (alreadySent) {
        console.log(`Email already sent to ${args.email} today`);
        return { success: false, error: "Already sent today" };
      }

      // Check user preferences
      const prefs = await ctx.runQuery(
        internal.emails.queries.getUserEmailPreferences,
        {
          userId: args.userId,
        },
      );

      if (prefs?.unsubscribedAt) {
        console.log(`User ${args.userId} unsubscribed`);
        return { success: false, error: "User unsubscribed" };
      }

      if (prefs?.dailySummaryEnabled === false) {
        console.log(`User ${args.userId} disabled daily summary`);
        return { success: false, error: "User disabled" };
      }

      // Get todo data
      const completedCount = await ctx.runQuery(
        internal.emails.queries.getCompletedTodoCount,
        {
          userId: args.userId,
        },
      );

      const todaysUncheckedCount = await ctx.runQuery(
        internal.emails.queries.getTodaysUncheckedCount,
        {
          userId: args.userId,
          date: today,
        },
      );

      const pinnedTodos = await ctx.runQuery(
        internal.emails.queries.getPinnedTodos,
        {
          userId: args.userId,
        },
      );

      const completedPomodoros = await ctx.runQuery(
        internal.emails.queries.getCompletedPomodoroCount,
        {
          userId: args.userId,
        },
      );

      // Generate email template
      const emailContent = await ctx.runQuery(
        internal.emails.templates.generateDailySummaryEmail,
        {
          userName: args.userName,
          completedCount,
          todaysUncheckedCount,
          pinnedTodos,
          completedPomodoros,
        },
      );

      // Send email via Resend
      const result = await resend.sendEmail(ctx, {
        to: args.email,
        from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      // Log the send
      await ctx.runMutation(internal.emails.mutations.logEmailSend, {
        userId: args.userId,
        sentDate: today,
        emailCount:
          completedCount +
          todaysUncheckedCount +
          pinnedTodos.length +
          completedPomodoros,
      });

      return {
        success: true,
        messageId: String(result),
      };
    } catch (error: any) {
      console.error("Email send error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
```

### Phase 6: Mutations

#### 6.1 Email Logging Mutation

**File: `convex/emails/mutations.ts`**

```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const logEmailSend = internalMutation({
  args: {
    userId: v.string(),
    sentDate: v.string(),
    emailCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("emailSends", {
      userId: args.userId,
      emailType: "daily_summary",
      sentDate: args.sentDate,
      sentAt: Date.now(),
      emailCount: args.emailCount,
    });
    return null;
  },
});
```

### Phase 7: Cron Job Configuration

#### 7.1 Daily Email Cron

**File: `convex/crons.ts`**

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Send daily summary emails at 8:00 AM UTC (adjust timezone as needed)
crons.cron(
  "send daily todo summary emails",
  "0 8 * * *", // 8:00 AM UTC daily
  internal.emails.daily.sendDailyEmails,
  {},
);

export default crons;
```

#### 7.2 Daily Email Sender

**File: `convex/emails/daily.ts`**

```typescript
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

export const sendDailyEmails = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting daily email send...");

    // Get all users
    const users = await ctx.runQuery(internal.emails.queries.getAllUsers);

    console.log(`Found ${users.length} users`);

    // Send email to each user
    for (const user of users) {
      try {
        const result = await ctx.runAction(
          internal.emails.send.sendDailySummaryEmail,
          {
            userId: user.userId,
            email: user.email,
            userName: `${user.firstName} ${user.lastName}`,
          },
        );

        if (result.success) {
          console.log(`Sent email to ${user.email}`);
        } else {
          console.log(`Skipped ${user.email}: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`Error sending to ${user.email}:`, error);
      }
    }

    console.log("Daily email send complete");
    return null;
  },
});
```

### Phase 8: User Email Preferences

#### 8.1 Email Preferences Queries

**Add to `convex/users.ts`:**

```typescript
export const getUserEmailPreferences = query({
  args: {},
  returns: v.object({
    dailySummaryEnabled: v.boolean(),
    unsubscribedAt: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const prefs = await ctx.db
      .query("emailPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!prefs) {
      // Default: enabled
      return {
        dailySummaryEnabled: true,
        unsubscribedAt: undefined,
      };
    }

    return {
      dailySummaryEnabled: prefs.dailySummaryEnabled,
      unsubscribedAt: prefs.unsubscribedAt,
    };
  },
});

export const updateEmailPreferences = mutation({
  args: {
    dailySummaryEnabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("emailPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        dailySummaryEnabled: args.dailySummaryEnabled,
        unsubscribedAt: args.dailySummaryEnabled ? undefined : Date.now(),
      });
    } else {
      await ctx.db.insert("emailPreferences", {
        userId,
        dailySummaryEnabled: args.dailySummaryEnabled,
        unsubscribedAt: args.dailySummaryEnabled ? undefined : Date.now(),
      });
    }

    return null;
  },
});
```

## File Structure

```
convex/
├── convex.config.ts          # Resend component integration
├── schema.ts                 # Database schema with email tables
├── crons.ts                  # Cron job configuration
├── emails/
│   ├── resend.ts            # Resend instance setup
│   ├── templates.ts          # Email template generation
│   ├── queries.ts            # Data retrieval queries
│   ├── mutations.ts          # Email logging mutations
│   ├── send.ts               # Email sending action
│   └── daily.ts              # Daily email scheduler
└── users.ts                  # Email preferences (extend existing)
```

## Testing

### Manual Testing

1. **Test Email Generation**: Call `generateDailySummaryEmail` internal query with sample data
2. **Test Email Sending**: Call `sendDailySummaryEmail` action for a single user
3. **Test Cron Job**: Manually trigger `sendDailyEmails` action
4. **Verify Email Delivery**: Check Resend dashboard for sent emails

### Environment Testing

- **Development**: Use test mode with `testMode: true` in Resend configuration
- **Production**: Set `testMode: false` and configure production Resend API key

## Best Practices

### Email Design

- **Mobile-First**: Design emails for mobile devices
- **Consistent Branding**: Use app colors (#0076C6 blue, #27A561 green, #EB5601 orange)
- **Clear Hierarchy**: Prominent stats, readable content
- **Unsubscribe Link**: Always include unsubscribe option

### Performance

- **Batch Processing**: Process all users in a single cron run
- **Error Handling**: Log errors but don't fail entire batch
- **Duplicate Prevention**: Check `emailSends` table before sending

### User Experience

- **Graceful Degradation**: Handle users with no todos
- **Smart Filtering**: Only show pinned todos if they exist
- **Preference Respect**: Honor user email preferences

## Production Deployment

### Environment Variables

Set these in your Convex deployment:

```bash
RESEND_API_KEY=re_prod_xxxxxxxxx
EMAIL_FROM_ADDRESS=updates@yourdomain.com
EMAIL_FROM_NAME=Better Todo
NODE_ENV=production
```

### Domain Setup

1. **Resend Domain Verification**: Add your domain to Resend dashboard
2. **DNS Configuration**: Set up SPF, DKIM, and DMARC records
3. **Subdomain Strategy**: Use dedicated subdomain for email (e.g., `updates.yourdomain.com`)

### Monitoring

- **Email Logs**: Check `emailSends` table for delivery status
- **Resend Dashboard**: Monitor email delivery rates
- **Error Logs**: Check Convex dashboard for action failures

## Rollout Strategy

### Phase 1: Internal Testing

- Deploy to development environment
- Test with internal users
- Verify email content and delivery

### Phase 2: Gradual Rollout

- Enable for 10% of users
- Monitor delivery rates and user feedback
- Adjust email content based on feedback

### Phase 3: Full Launch

- Enable for all users
- Set up monitoring and alerting
- Document troubleshooting procedures

## Conclusion

This implementation provides a robust daily email summary system for Better Todo users. The modular architecture allows for easy customization and extension, while the comprehensive error handling ensures reliable operation in production.

Key benefits:

- **Type-Safe**: Full TypeScript integration with Convex validators
- **Scalable**: Efficient batch processing for all users
- **User-Friendly**: Respects preferences and handles edge cases
- **Maintainable**: Clean separation of concerns and modular design
