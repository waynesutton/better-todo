import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Debug environment variables
console.log("Environment Variables:", {
  VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
  VITE_WORKOS_CLIENT_ID: import.meta.env.VITE_WORKOS_CLIENT_ID,
  VITE_WORKOS_REDIRECT_URI: import.meta.env.VITE_WORKOS_REDIRECT_URI,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
      redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
    >
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  </React.StrictMode>,
);
