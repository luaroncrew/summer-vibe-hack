import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The wall is a client-side SPA (HashRouter), so it can be served as static
// files from anywhere — including ascii.dev alongside the landing page.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180 },
});
