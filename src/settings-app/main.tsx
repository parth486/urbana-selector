import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Styles
import "./styles/styles.css";

const container = document.getElementById("urbana-settings-root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
