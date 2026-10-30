// Quién ve qué, según su rol y su área: un Responsable del proceso de otra área no debe ver los
// registros que no son suyos ni de su área, y el menú solo muestra lo que cada rol puede usar.
import { test, expect } from "@playwright/test";
import { ingresar, CORREOS } from "./ayuda.js";

test("el menú muestra solo lo que cada rol puede usar", async ({ page }) => {
  await ingresar(page, CORREOS.produccion);   // Responsable del proceso
  const nav = page.locator(".sidebar .nav button");
  await expect(nav.filter({ hasText: "Nuevo registro" })).toBeVisible();
  await expect(nav.filter({ hasText: "Registros" })).toBeVisible();
  await expect(nav.filter({ hasText: "Usuarios" })).toHaveCount(0);
  await expect(nav.filter({ hasText: "Tipos de desviación" })).toHaveCount(0);
  await expect(nav.filter({ hasText: "Registros eliminados" })).toHaveCount(0);
  await expect(nav.filter({ hasText: "Uso del almacenamiento" })).toHaveCount(0);
});

test("el Aprobador no puede crear registros", async ({ page }) => {
  await ingresar(page, CORREOS.aprobador);
  await expect(page.locator(".sidebar .nav button").filter({ hasText: "Nuevo registro" })).toHaveCount(0);
});

test("un Responsable de otra área no ve un registro ajeno en la lista", async ({ page }) => {
  // Datos de ejemplo del modo demostración: MTC-001 es de Camilo (Calidad Producto).
  await ingresar(page, CORREOS.produccion);   // su área es Producción
  await page.getByRole("button", { name: "Registros" }).click();
  await expect(page.locator(".row", { hasText: "MTC-001" })).toHaveCount(0);
});

test("el Administrador ve todos los registros, sin importar el área", async ({ page }) => {
  await ingresar(page, CORREOS.admin);
  await page.getByRole("button", { name: "Registros", exact: true }).click();
  await expect(page.locator(".row", { hasText: "MTC-001" })).toBeVisible();
});
