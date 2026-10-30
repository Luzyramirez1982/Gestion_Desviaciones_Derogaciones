// Una Derogación no exige el 8D completo al crearla («complete lo que conozca; debe quedar
// completo antes de aprobar la evaluación», dice el propio formulario). Esta prueba comprueba
// la regla tal cual: se crea con el 8D vacío, el Aprobador no puede aprobar hasta completarlo,
// y una vez completo sí puede.
import { test, expect } from "@playwright/test";
import { campo, ingresar, salir, firmar, CORREOS } from "./ayuda.js";

test("una Derogación exige el 8D completo antes de aprobar, no antes de crear", async ({ page }) => {
  await ingresar(page, CORREOS.produccion);
  await page.getByRole("button", { name: "Nuevo registro" }).click();

  await campo(page, "reportadoPor").fill("Paula Producción");
  await campo(page, "cargo").fill("Jefa de Producción");
  await campo(page, "areaSolicitante").fill("Producción");
  await campo(page, "procesoSolicitante").fill("Línea 1");
  await campo(page, "ot").fill("OT-E2E-002");
  await campo(page, "proyecto").fill("Prueba automática — derogación");
  await campo(page, "lineaNegocio").selectOption("Logística");
  await campo(page, "tipoGestion").selectOption("Derogación");   // habilita el bloque del 8D
  await campo(page, "requisitoIncumplido").fill("Especificación técnica ET-09");
  await campo(page, "equipoInvolucrado").fill("Línea de empaque 1");
  await campo(page, "tareaDescripcion").fill("Se requiere usar un material alterno por desabastecimiento.");
  await campo(page, "motivoDesviacion").fill("El proveedor habitual no tiene el material disponible.");
  await campo(page, "consecuenciasPotenciales").fill("Posible variación menor en el empaque.");
  await campo(page, "controlesCompensatorios").fill("Inspección reforzada del lote.");
  await campo(page, "confirmaVeraz").check();
  await firmar(page, "#firmaCanvas");
  await page.getByRole("button", { name: "Firmar y enviar solicitud" }).click();
  await expect(page.getByText("Su solicitud fue registrada")).toBeVisible();
  const consecutivo = await page.locator("#consecutivoCreado").innerText();
  await salir(page);

  // El Aprobador abre la solicitud: el 8D sigue vacío y lo dice claramente.
  await ingresar(page, CORREOS.aprobador);
  await page.getByRole("button", { name: "Registros" }).click();
  await page.locator(".row", { hasText: consecutivo }).first().click();
  await expect(page.getByText("8D incompleto")).toBeVisible();

  await page.locator('[data-campo="conceptoEvaluacion"]').fill("Viable con inspección reforzada.");
  await page.locator('[data-campo="controlesCompensatorios"]').fill("Inspección 100 % del lote.");

  // Firma sin completar el 8D: la base debe rechazarlo con un mensaje claro, no en silencio.
  await firmar(page, "#firmaCanvas");
  await page.getByRole("button", { name: /Evaluar, aprobar y firmar/ }).click();
  // El mismo motivo aparece a propósito en dos sitios (el aviso flotante y el banner junto al botón).
  await expect(page.locator("#avisos").getByText(/reporte 8D completo/i)).toBeVisible();
  await expect(page.getByText(/Etapa 2 · Evaluación y Aprobación/)).toBeVisible();   // sigue en Evaluación: no avanzó

  // Se completa el 8D.
  const d8 = page.locator("#d8-section");
  await d8.locator('[data-d8="d1"]').fill("Equipo: Producción, Calidad y el proveedor.");
  await d8.locator('[data-w2h="what"]').fill("Uso de material alterno en empaque.");
  await d8.locator('[data-w2h="where"]').fill("Línea de empaque 1.");
  await d8.locator('[data-w2h="when"]').fill("Esta semana.");
  await d8.locator('[data-w2h="who"]').fill("Equipo de producción.");
  await d8.locator('[data-w2h="why"]').fill("Para no detener la línea.");
  await d8.locator('[data-w2h="how"]').fill("Reemplazo temporal de material.");
  await d8.locator('[data-w2h="howMuch"]').fill("Un lote de 500 unidades.");
  await d8.locator('[data-why="0"]').fill("Porque el proveedor no entregó a tiempo.");
  await d8.locator('[data-why="1"]').fill("Porque no hay un segundo proveedor calificado.");
  await d8.locator('[data-why="2"]').fill("Porque no se evaluó un proveedor alterno antes.");
  await d8.locator('[data-act="d3|0|accion"]').fill("Separar e identificar el lote con material alterno.");
  await d8.locator('[data-act="d3|0|puntoControl"]').fill("Inspección 100 % en empaque.");
  await d8.locator('[data-act="d3|0|fecha"]').fill("2026-11-05");
  await d8.locator('[data-act="d3|0|responsable"]').fill("Paula Producción");
  await d8.locator('[data-d8="d4"]').fill("Causa raíz: falta de un segundo proveedor calificado.");
  await d8.locator('[data-act="d5|0|causa"]').fill("Un solo proveedor calificado para este material.");
  await d8.locator('[data-act="d5|0|accion"]').fill("Calificar un segundo proveedor.");
  await d8.locator('[data-act="d5|0|fecha"]').fill("2026-12-01");
  await d8.locator('[data-act="d5|0|responsable"]').fill("Compras");
  await d8.locator('[data-d8="d6"]').fill("Se valida con una auditoría de calidad al cierre del lote.");
  await d8.locator('[data-d8="d7"]').fill("Se incluye en el plan de proveedores alternos de todas las líneas.");
  await d8.locator('[data-d8="d8"]').fill("Cierre con el equipo y reconocimiento del buen manejo de la contingencia.");
  await expect(page.getByText("8D completo.")).toBeVisible();

  // Ahora sí se puede aprobar y firmar.
  await firmar(page, "#firmaCanvas");
  await page.getByRole("button", { name: /Evaluar, aprobar y firmar/ }).click();
  await expect(page.getByText("Firma registrada.")).toBeVisible();
  await expect(page.getByText(/Etapa 3 · Cierre/)).toBeVisible();
});
