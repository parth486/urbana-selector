import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "assets/dist",
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        "stepper-app": "./src/stepper-app/main.tsx",
        "data-builder-app": "./src/data-builder-app/main.tsx",
        "admin-orders-app": "./src/admin-orders-app/main.tsx",
      },
      output: {
        format: "es",
        entryFileNames: "js/[name].js",
        assetFileNames: "assets/[name].[ext]",
        inlineDynamicImports: false,
      },
    },

    chunkSizeWarningLimit: 10000, // Increase limit to avoid warnings for large bundles

    assetsDir: "", // This prevents the 'assets' subfolder
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  base: "./",
});
