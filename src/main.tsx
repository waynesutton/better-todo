import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider } from "convex/react";
import { ConvexReactClient } from "convex/react";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ConvexProvider>
  </StrictMode>,
);
