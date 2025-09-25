import { HeroUIProvider, ToastProvider } from "@heroui/react";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";

import "./styles/styles.css";

ReactDOM.createRoot(document.getElementById("urbana-stepper-root")!).render(
  <React.StrictMode>
    <HeroUIProvider>
      <ToastProvider />
      <main className="text-foreground bg-background">
        <App />
      </main>
    </HeroUIProvider>
  </React.StrictMode>
);
