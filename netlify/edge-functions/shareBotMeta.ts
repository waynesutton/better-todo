import type { Context } from "https://edge.netlify.com";

// Social media crawler User-Agents to detect
const BOT_USER_AGENTS = [
  "facebookexternalhit", // Facebook
  "facebookcatalog", // Facebook
  "twitterbot", // Twitter/X
  "linkedinbot", // LinkedIn
  "slackbot", // Slack
  "discordbot", // Discord
  "telegrambot", // Telegram
  "whatsapp", // WhatsApp
  "pinterest", // Pinterest
  "opengraph", // Generic Open Graph crawlers
  "opengraphbot",
  "bot ", // Generic bot pattern (note trailing space)
  "crawler",
  "embedly", // Embedly
  "vkshare", // VKontakte
  "quora link preview", // Quora
  "redditbot", // Reddit
  "pinterestbot", // Pinterest
];

// Convex deployment URL
const CONVEX_URL = "https://next-crane-985.convex.cloud";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // Only intercept requests to /share/:slug
  if (!url.pathname.startsWith("/share/")) {
    return context.next();
  }

  // Extract slug from path
  const pathParts = url.pathname.split("/");
  const slug = pathParts[2]; // /share/:slug

  if (!slug) {
    return context.next();
  }

  // Check if this is a bot/crawler
  const userAgent = request.headers.get("user-agent") || "";
  const isBot = BOT_USER_AGENTS.some((bot) =>
    userAgent.toLowerCase().includes(bot.toLowerCase()),
  );

  // If not a bot, let the SPA handle it
  if (!isBot) {
    return context.next();
  }

  // For bots, fetch server-rendered HTML from Convex meta endpoint
  try {
    const convexUrl = `${CONVEX_URL}/meta/share?slug=${encodeURIComponent(slug)}`;
    const response = await fetch(convexUrl);

    if (response.ok) {
      return new Response(await response.text(), {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          // Add cache headers
          "Cache-Control":
            "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    // If not found or error, fall back to SPA
    return context.next();
  } catch (error) {
    // On any error, fall back to SPA
    console.error("Error fetching meta from Convex:", error);
    return context.next();
  }
};

