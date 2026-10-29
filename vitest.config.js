import { defineConfig } from "vitest/config";

// Dos grupos: las pruebas de base de datos corren en node y las de interfaz (tests/ui/) en jsdom.
export default defineConfig({
  test: {
    projects: [
      { test: { name: "datos", environment: "node", include: ["tests/*.test.js"] } },
      { test: { name: "interfaz", environment: "jsdom", include: ["tests/ui/**/*.test.js"] } },
    ],
  },
});
