import { defineConfig } from "vite";

// La app nueva vive en app/. El resultado queda en dist/ (lo que publica Cloudflare Pages).
export default defineConfig({
  root: "app",
  envDir: "..",
  build: { outDir: "../dist", emptyOutDir: true },
});
