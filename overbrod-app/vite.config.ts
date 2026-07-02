import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// base: "./" makes built asset paths relative, so the production build can be
// opened directly (e.g. from the filesystem or any subpath) without a server.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
