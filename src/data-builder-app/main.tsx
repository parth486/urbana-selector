import "../shared/consoleGuard";
import "../shared/iconPatch";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";

import "./styles/styles.css";

const rootEl = document.getElementById("urbana-data-builder-root");

/**
 * Helper: mount the app if the container exists now.
 * Also attach a fallback to DOMContentLoaded so transient timing issues don't prevent a mount.
 */
const mountApp = () => {
  const container = document.getElementById("urbana-data-builder-root");
  if (!container) {
    // Defensive: avoid React crash if the container isn't present (helps with admin scripting order)
    // DON'T log an error on every attempt — that causes huge console spam when the node is absent.
    // Instead, return false and let the retry loop decide whether/when to log a final message.
    return false;
  }

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
    <HeroUIProvider>
      <ToastProvider />
      <main className="text-foreground bg-background">
        <App />
      </main>
    </HeroUIProvider>
    </React.StrictMode>
  );
  return true;
};

// Try initial mount attempt with retries. Keep logs quiet (use debug only if never mounted)
const tryMountWithRetries = (maxAttempts = 20, intervalMs = 100) => {
  let attempts = 0;
  let mounted = false;

  const attempt = () => {
    attempts++;
    mounted = mountApp();
      if (mounted || attempts >= maxAttempts) {
      if (!mounted) {
        // The mount node wasn't found after retries. Keep quiet in normal operation.
      }
      return;
    }
    setTimeout(attempt, intervalMs);
  };

  // Start first attempt immediately
  attempt();
};

tryMountWithRetries(20, 100);
