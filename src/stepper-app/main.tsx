import "../shared/consoleGuard";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import "../shared/iconPatch";
import React from "react";
import ReactDOM from "react-dom/client";

// Early runtime diagnostics: confirm module evaluation as soon as this file is parsed
if (typeof window !== "undefined") {
  (window as any).__urbana_diag = (window as any).__urbana_diag || { errors: [] };
  try {
    const _isDebug = (window as any).urbanaDebugMode || (window as any).urbanaAdmin?.debugMode || (window as any).urbanaPublic?.debugMode || false;
    if (_isDebug) {
      console.warn("[Urbana Stepper] ENTRY: bundle evaluated");
    }
    (window as any).__urbana_diag.entryEvaluated = true;
  } catch (e) {
    // ignore
  }
}

import App from "./App.tsx";
import ErrorBoundary from "../shared/ErrorBoundary";

import "./styles/styles.css";

try {
  ReactDOM.createRoot(document.getElementById("urbana-stepper-root")!).render(
    <React.StrictMode>
      <HeroUIProvider>
        <ToastProvider />
        <ErrorBoundary>
          <main className="text-foreground bg-background">
            <App />
          </main>
        </ErrorBoundary>
      </HeroUIProvider>
    </React.StrictMode>
  );
} catch (renderErr) {
  console.error('[Urbana Stepper] render call failed', renderErr);
  try {
    (window as any).__urbana_diag = (window as any).__urbana_diag || { errors: [] };
    (window as any).__urbana_diag.errors.push({ type: 'render_error', message: String(renderErr), stack: renderErr && renderErr.stack ? renderErr.stack : null });
  } catch (e) {}
}

// Global runtime diagnostics and module entry logs (gated by debug settings)
if (typeof window !== "undefined") {
  (window as any).__urbana_diag = (window as any).__urbana_diag || { errors: [] };

  window.addEventListener(
    "error",
    (e) => {
      try {
        const msg = e && (e.error && e.error.message ? e.error.message : e.message || String(e));
        console.error("[Urbana diag] global error:", msg, e.error || e);
        (window as any).__urbana_diag.errors.push({ type: "error", message: msg, stack: e && e.error && e.error.stack ? e.error.stack : null });
      } catch (err) {
        // ignore
      }
    },
    true
  );

  window.addEventListener("unhandledrejection", (e) => {
    try {
      const reason = e && (e.reason && e.reason.message ? e.reason.message : String(e.reason));
      console.error("[Urbana diag] unhandledrejection:", reason, e.reason || e);
      (window as any).__urbana_diag.errors.push({ type: "unhandledrejection", message: reason, stack: e && e.reason && e.reason.stack ? e.reason.stack : null });
    } catch (err) {
      // ignore
    }
  }, true);

  try {
    (window as any).urbanaStepperEntry = true;
    const isDebug = (window as any).urbanaDebugMode || (window as any).urbanaAdmin?.debugMode || (window as any).urbanaPublic?.debugMode || false;
    if (isDebug) {
      console.warn("[Urbana Stepper] module entry");
      console.log("[Urbana Stepper] attempting to render");
    }

    try {
      (window as any).urbanaStepperLoaded = true;
      if (isDebug) console.log("[Urbana Stepper] main bundle loaded");
    } catch (innerErr) {
      console.error('[Urbana Stepper] error setting loaded flag', innerErr);
      (window as any).__urbana_diag.errors.push({ type: "flag_error", message: String(innerErr), stack: innerErr && innerErr.stack ? innerErr.stack : null });
      throw innerErr;
    }
  } catch (e) {
    console.error('[Urbana Stepper] module initialization error', e);
    try {
      (window as any).__urbana_diag.errors.push({ type: "init_error", message: String(e), stack: e && e.stack ? e.stack : null });
    } catch (err) {
      // ignore
    }
  }
}
