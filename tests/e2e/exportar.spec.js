// El Excel histórico y el PDF de trazabilidad se generan en el navegador (jsPDF / write-excel-file).
// Esta prueba comprueba que la descarga ocurre de verdad, no solo que el botón exista.
import { test, expect } from "@playwright/test";
import { ingresar, firmar, CORREOS } from "./ayuda.js";

test("descargar el histórico en Excel desde la lista de registros", async ({ page }) => {
  await ingresar(page, CORREOS.admin);
  await page.getByRole("button", { name: "Registros", exact: true }).click();
  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar histórico (Excel)" }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/\.xlsx$/i);
});

test("cerrar una solicitud y descargar su PDF de trazabilidad", async ({ page }) => {
  // MTC-002 (dato de ejemplo) ya está en Cierre; falta cerrarla.
  await ingresar(page, CORREOS.produccion);
  await page.getByRole("button", { name: "Registros", exact: true }).click();
  await page.locator(".row", { hasText: "MTC-002" }).first().click();

  await page.locator('[data-campo="observacionesCierre"]').fill("Línea reparada. Prueba automática de descarga.");
  await page.locator('[data-campo="cumplimientoControl"]').selectOption("Sí");
  await firmar(page, "#firmaCanvas");
  await page.getByRole("button", { name: /Cerrar solicitud y firmar/ }).click();
  await expect(page.getByText(/Solicitud cerrada/)).toBeVisible();

  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Descargar PDF de trazabilidad" }).click(),
  ]);
  expect(descarga.suggestedFilename()).toMatch(/MTC-002.*\.pdf$/i);
});
