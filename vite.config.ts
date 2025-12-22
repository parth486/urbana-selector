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
      // Ensure specific subpath is matched before the broader 'react' alias to avoid fallback resolution
      'react/jsx-runtime': resolve(__dirname, 'src/shims/react-jsx-runtime.ts'),
      // Shims to ensure admin bundles use WordPress' React instance (wp.element)
      // This avoids duplicate React instances and fixes useContext null errors from icon libraries.
      react: resolve(__dirname, 'src/shims/react-shim.ts'),
      'react-dom/client': resolve(__dirname, 'src/shims/react-dom-shim.ts'),
      'react-dom': resolve(__dirname, 'src/shims/react-dom-shim.ts'),
    },

  },
  base: "./",
});
