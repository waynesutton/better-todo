import { WorkOS } from "@workos-inc/node";

// Initialize WorkOS client
const workos = new WorkOS(process.env.WORKOS_API_KEY);
const clientId = process.env.WORKOS_CLIENT_ID;

export const handler = async (event: any) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const { code } = event.queryStringParameters || {};

    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing authorization code" }),
      };
    }

    if (!clientId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "WORKOS_CLIENT_ID not configured" }),
      };
    }

    // Exchange authorization code for session
    const { accessToken, refreshToken, user } =
      await workos.userManagement.authenticateWithCode({
        code,
        clientId,
      });

    console.log("WorkOS authentication successful:", { userId: user.id });

    // Create session cookie (7 days expiry)
    const cookieExpiry = new Date();
    cookieExpiry.setDate(cookieExpiry.getDate() + 7);

    // Store tokens securely in HTTP-only cookies
    const cookies = [
      `workos_access_token=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${cookieExpiry.toUTCString()}`,
      `workos_refresh_token=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${cookieExpiry.toUTCString()}`,
      `workos_user=${encodeURIComponent(JSON.stringify(user))}; Path=/; Secure; SameSite=Lax; Expires=${cookieExpiry.toUTCString()}`,
    ];

    // Redirect back to home page
    return {
      statusCode: 302,
      headers: {
        Location: "/",
        "Set-Cookie": cookies.join(", "),
      },
      body: "",
    };
  } catch (error: any) {
    console.error("WorkOS authentication error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Authentication failed",
        message: error.message,
      }),
    };
  }
};
