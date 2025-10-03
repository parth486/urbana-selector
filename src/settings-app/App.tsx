import React from "react";
import { SettingsManager } from "./components/SettingsManager";

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SettingsManager />
    </div>
  );
};
