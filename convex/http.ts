import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Meta endpoint for shared notes (for Open Graph crawlers)
http.route({
  path: "/meta/share",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    // Prefer explicit query param, fall back to last path segment
    let slug = url.searchParams.get("slug");
    if (!slug) {
      const parts = url.pathname.split("/");
      slug = parts[parts.length - 1] || "";
    }

    if (!slug) {
      return new Response("Missing slug", { status: 400 });
    }

    const note = await ctx.runQuery(internal.fullPageNotes.getSharedNoteMetadata, {
      slug,
    });
    
    if (!note) {
      return new Response("Note not found", { status: 404 });
    }

    const html = generateNoteHTML(note);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Cache for browsers and CDNs while allowing quick refreshes
        "Cache-Control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
  }),
});

function generateNoteHTML(note: {
  title: string;
  content: string;
  screenshotUrl: string | null;
  slug: string;
}) {
  const imageUrl =
    note.screenshotUrl ||
    "https://better-todo.co/better-todo-open-graph-image.png";
  const canonicalUrl = `https://better-todo.co/share/${note.slug}`;
  const siteName = "better todo";
  const twitterHandle = "@waynesutton";

  // Escape HTML characters in dynamic content to prevent XSS
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const safeTitle = escapeHtml(note.title);
  // Create a short description from content (first 160 chars)
  const contentPreview = note.content.substring(0, 160).replace(/\n/g, " ");
  const safeDescription = escapeHtml(contentPreview);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Basic SEO -->
  <title>${safeTitle} | ${siteName}</title>
  <meta name="description" content="${safeDescription}">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${safeTitle} | ${siteName}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${siteName}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="${twitterHandle}">
  <meta name="twitter:creator" content="${twitterHandle}">
  <meta name="twitter:title" content="${safeTitle} | ${siteName}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Redirect to actual app after a brief delay for crawlers -->
  <script>
    setTimeout(() => {
      window.location.href = "${canonicalUrl}";
    }, 100);
  </script>
</head>
<body>
  <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
    <h1>${safeTitle}</h1>
    <p>${safeDescription}</p>
    <p><small>Redirecting to full page...</small></p>
  </div>
</body>
</html>`;
}

export default http;
