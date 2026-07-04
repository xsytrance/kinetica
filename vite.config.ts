import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Static SPA — hostable free on GitHub Pages / Vercel / Netlify with no server.
// `base` is relative so it also works from a subpath (e.g. GitHub Pages project sites).
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
