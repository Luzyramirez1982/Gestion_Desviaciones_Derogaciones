import { defineConfig, devices } from "@playwright/test";

// Pruebas de extremo a extremo: un navegador real (Chromium) contra la aplicación ya compilada
// (lo mismo que se publica), en modo demostración (sin conectar a una base de datos real).
// `npm run test:e2e` compila y las corre; Playwright levanta el servidor y lo apaga solo.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
