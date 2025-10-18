// Get current authenticated user from cookie
export const handler = async (event: any) => {
  // Handle CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const cookies = event.headers.cookie || "";
    const userCookie = cookies
      .split(";")
      .find((c: string) => c.trim().startsWith("workos_user="));

    if (!userCookie) {
      return {
        statusCode: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ error: "Not authenticated" }),
      };
    }

    const userJson = decodeURIComponent(userCookie.split("=")[1]);
    const user = JSON.parse(userJson);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user }),
    };
  } catch (error: any) {
    console.error("Error reading user session:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Failed to read session" }),
    };
  }
};
