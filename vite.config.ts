import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {resolve} from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "assets/dist",
    rollupOptions: {
      input: {
        index: "./src/index.tsx",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
