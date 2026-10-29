import { defineConfig } from "vite";

// index.html está en la raíz y el código en src/. El resultado queda en dist/ (lo que publica Cloudflare Pages).
// Los archivos de public/ (como las cabeceras de seguridad) se copian tal cual.
export default defineConfig({
  build: { outDir: "dist", emptyOutDir: true },
});
