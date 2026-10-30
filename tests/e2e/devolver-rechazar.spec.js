// El Aprobador autorizado puede devolver una solicitud para que la corrijan, o rechazarla.
// Ambas acciones exigen escribir el motivo.
import { test, expect } from "@playwright/test";
import { campo, ingresar, salir, firmar, CORREOS } from "./ayuda.js";

async function crearSolicitud(page, prefijoOt){
  await page.getByRole("button", { name: "Nuevo registro" }).click();
  await campo(page, "reportadoPor").fill("Camilo Calidad");
  await campo(page, "cargo").fill("Analista de Calidad");
  await campo(page, "areaSolicitante").fill("Calidad");
  await campo(page, "procesoSolicitante").fill("Inspección final");
  await campo(page, "ot").fill(prefijoOt);
  await campo(page, "proyecto").fill("Prueba automática");
  await campo(page, "lineaNegocio").selectOption("Logística");
  await campo(page, "requisitoIncumplido").fill("Procedimiento PR-02");
  await campo(page, "equipoInvolucrado").fill("Línea de empaque");
  await campo(page, "tareaDescripcion").fill("Descripción de prueba para la tarea.");
  await campo(page, "motivoDesviacion").fill("Motivo de prueba.");
  await campo(page, "consecuenciasPotenciales").fill("Sin impacto esperado.");
  await campo(page, "controlesCompensatorios").fill("Control de prueba.");
  await campo(page, "confirmaVeraz").check();
  await firmar(page, "#firmaCanvas");
  await page.getByRole("button", { name: "Firmar y enviar solicitud" }).click();
  await expect(page.getByText("Su solicitud fue registrada")).toBeVisible();
  const consecutivo = await page.locator("#consecutivoCreado").innerText();
  // Se sale de la pantalla de confirmación como lo haría una persona real: si no, «Nuevo registro»
  // sigue mostrando ese aviso en vez del formulario (con los borradores) la próxima vez que se abra.
  await page.getByRole("button", { name: "Ver registros" }).click();
  return consecutivo;
}

test("devolver: el dueño la corrige y la reenvía con una nueva firma", async ({ page }) => {
  await ingresar(page, CORREOS.calidad);
  const consecutivo = await crearSolicitud(page, "OT-E2E-DEV");
  await salir(page);

  await ingresar(page, CORREOS.aprobador);
  await page.getByRole("button", { name: "Registros" }).click();
  await page.locator(".row", { hasText: consecutivo }).first().click();
  await page.locator("#comentarioEtapa").fill("Falta detallar mejor el control compensatorio.");
  await page.getByRole("button", { name: "Devolver al Responsable del proceso" }).click();
  await expect(page.getByText("Solicitud devuelta para ajustes.")).toBeVisible();
  await page.getByLabel("Cerrar", { exact: true }).click();   // cierra el panel del registro (queda abierto a propósito)
  await salir(page);

  await ingresar(page, CORREOS.calidad);
  await page.getByRole("button", { name: "Nuevo registro" }).click();
  // El texto puede coincidir también con un aviso flotante que todavía no se borró; se busca solo
  // en la insignia del borrador.
  await expect(page.locator(".badge", { hasText: "Devuelta para ajustes" })).toBeVisible();
  await expect(page.getByText("Falta detallar mejor el control compensatorio.")).toBeVisible();
  await page.getByRole("button", { name: /Continuar editando/ }).click();

  await campo(page, "controlesCompensatorios").fill("Doble verificación visual, registrada en bitácora.");
  await campo(page, "confirmaVeraz").check();
  await firmar(page, "#firmaCanvas");
  await page.getByRole("button", { name: "Firmar y enviar solicitud" }).click();
  await expect(page.getByText("Su solicitud fue registrada")).toBeVisible();
  await expect(page.locator("#consecutivoCreado")).toHaveText(consecutivo);   // el mismo consecutivo, no uno nuevo
});

test("rechazar: la solicitud queda cerrada como Rechazada", async ({ page }) => {
  await ingresar(page, CORREOS.calidad);
  const consecutivo = await crearSolicitud(page, "OT-E2E-RECH");
  await salir(page);

  await ingresar(page, CORREOS.aprobador);
  await page.getByRole("button", { name: "Registros" }).click();
  await page.locator(".row", { hasText: consecutivo }).first().click();
  await page.locator("#comentarioEtapa").fill("No cumple el procedimiento vigente.");
  await page.getByRole("button", { name: "Rechazar solicitud" }).click();
  await expect(page.getByText("¿Rechazar la solicitud?")).toBeVisible();
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();

  await expect(page.getByText("Solicitud rechazada.", { exact: true })).toBeVisible();   // el aviso flotante
  await expect(page.getByText("Solicitud rechazada. Ver el motivo en la bitácora.")).toBeVisible();   // el banner del registro
});
