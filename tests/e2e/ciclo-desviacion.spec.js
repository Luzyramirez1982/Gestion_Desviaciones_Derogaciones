// Recorre el ciclo completo de una Desviación con tres personas distintas, como lo haría la
// clienta: el Responsable del proceso la crea y firma, el Aprobador autorizado la evalúa y
// aprueba, y el mismo Responsable la cierra. Confirma que cada etapa exige su firma y que la
// solicitud termina «Cerrada».
import { test, expect } from "@playwright/test";
import { campo, ingresar, salir, firmar, CORREOS } from "./ayuda.js";

test("una Desviación recorre Solicitud → Evaluación y Aprobación → Cierre", async ({ page }) => {
  // 1) El Responsable del proceso (Calidad Producto) la crea y firma.
  await ingresar(page, CORREOS.calidad);
  await page.getByRole("button", { name: "Nuevo registro" }).click();

  await campo(page, "reportadoPor").fill("Camilo Calidad");
  await campo(page, "cargo").fill("Analista de Calidad");
  await campo(page, "areaSolicitante").fill("Calidad");
  await campo(page, "procesoSolicitante").fill("Inspección final");
  await campo(page, "ot").fill("OT-E2E-001");
  await campo(page, "proyecto").fill("Prueba automática");
  await campo(page, "lineaNegocio").selectOption("Logística");
  await campo(page, "requisitoIncumplido").fill("Procedimiento de inspección PR-01");
  await campo(page, "equipoInvolucrado").fill("Báscula de línea 2");
  await campo(page, "tareaDescripcion").fill("Pesaje fuera de tolerancia detectado en el turno.");
  await campo(page, "motivoDesviacion").fill("La báscula está en calibración y no hay repuesto.");
  await campo(page, "consecuenciasPotenciales").fill("Posible despacho con peso fuera de rango.");
  await campo(page, "controlesCompensatorios").fill("Pesaje manual verificado por dos personas.");
  await campo(page, "confirmaVeraz").check();
  await firmar(page, "#firmaCanvas");
  await page.getByRole("button", { name: "Firmar y enviar solicitud" }).click();

  await expect(page.getByText("Su solicitud fue registrada")).toBeVisible();
  const consecutivo = await page.locator("#consecutivoCreado").innerText();
  expect(consecutivo).toMatch(/^MTC-\d{3}$/);
  await salir(page);

  // 2) El Aprobador autorizado evalúa, aprueba y firma: pasa a Cierre.
  await ingresar(page, CORREOS.aprobador);
  await page.getByRole("button", { name: "Registros" }).click();
  await page.locator(".row", { hasText: consecutivo }).first().click();

  await page.locator('[data-campo="conceptoEvaluacion"]').fill("Viable mientras se repara la báscula.");
  await page.locator('[data-campo="controlesCompensatorios"]').fill("Doble verificación manual del peso.");
  await firmar(page, "#firmaCanvas");
  await page.getByRole("button", { name: /Evaluar, aprobar y firmar/ }).click();
  await expect(page.getByText("Firma registrada.")).toBeVisible();
  await expect(page.getByText(/Etapa 3 · Cierre/)).toBeVisible();
  await page.getByLabel("Cerrar", { exact: true }).click();
  await salir(page);

  // 3) El mismo Responsable (dueño de la solicitud) la cierra.
  await ingresar(page, CORREOS.calidad);
  await page.getByRole("button", { name: "Registros" }).click();
  await page.locator(".row", { hasText: consecutivo }).first().click();

  await page.locator('[data-campo="observacionesCierre"]').fill("Báscula reparada y recalibrada. Sin producto afectado.");
  await page.locator('[data-campo="cumplimientoControl"]').selectOption("Sí");
  await firmar(page, "#firmaCanvas");
  await page.getByRole("button", { name: /Cerrar solicitud y firmar/ }).click();

  await expect(page.getByText(/Solicitud cerrada/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Descargar PDF de trazabilidad" })).toBeVisible();
});
