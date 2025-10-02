import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "assets/dist",
    rollupOptions: {
      input: {
        "stepper-app": "./src/stepper-app/main.tsx",
        "data-builder-app": "./src/data-builder-app/main.tsx",
        "admin-orders-app": "./src/admin-orders-app/main.tsx",
        "settings-app": "./src/settings-app/main.tsx",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
    cssCodeSplit: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  base: "./",
});
