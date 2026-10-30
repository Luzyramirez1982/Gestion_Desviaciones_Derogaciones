import { defineConfig } from "vitest/config";

// Dos grupos: las pruebas de base de datos corren en node y las de interfaz (tests/ui/) en jsdom.
//
// Las de "datos" arrancan cada una su propia base de pruebas (PGlite, un PostgreSQL dentro de Node),
// que sola tarda alrededor de 1 segundo. Como vitest las corre varias a la vez, varias bases arrancando
// juntas compiten por el procesador y pueden tardar más de los 10 segundos que da por defecto; con
// este margen alcanza incluso en un equipo cargado de trabajo.
export default defineConfig({
  test: {
    projects: [
      { test: { name: "datos", environment: "node", include: ["tests/*.test.js"], hookTimeout: 30000 } },
      { test: { name: "interfaz", environment: "jsdom", include: ["tests/ui/**/*.test.js"] } },
    ],
  },
});
