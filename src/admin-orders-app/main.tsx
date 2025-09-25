import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/styles.css";
import { HeroUIProvider } from "@heroui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const container = document.getElementById("urbana-admin-orders-root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <HeroUIProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </HeroUIProvider>
    </React.StrictMode>
  );
}
