// Ayudas comunes para las pruebas de extremo a extremo: entrar y salir con las cuentas de
// demostración (ver src/datos/ejemplo.js), y dibujar en el recuadro de firma.
//
// Los campos del formulario se ubican por su atributo "name" (no por la etiqueta): el <label> no
// está asociado al <input> con "for" en el HTML actual, así que getByLabel no los encuentra.
// Está anotado como hallazgo de accesibilidad para corregir aparte.
import { expect } from "@playwright/test";

export const CLAVE_DEMO = "Demo2026";
export const CORREOS = {
  admin: "admin@ejemplo.test",
  calidad: "calidad@ejemplo.test",
  produccion: "produccion@ejemplo.test",
  sst: "sst@ejemplo.test",
  aprobador: "aprobador@ejemplo.test",
};

export const campo = (page, nombre) => page.locator(`[name="${nombre}"]`);

// En modo demostración los datos solo viven en la memoria de esa carga de página («se pierden al
// recargar», como dice el propio instructivo). Por eso, si el formulario de ingreso ya está en
// pantalla (tras salir()), no se recarga: así una persona sigue viendo lo que creó la anterior.
export async function ingresar(page, correo, clave = CLAVE_DEMO){
  const yaEnIngreso = await campo(page, "correo").isVisible().catch(() => false);
  if(!yaEnIngreso) await page.goto("/");
  await campo(page, "correo").fill(correo);
  await campo(page, "clave").fill(clave);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
}

export async function salir(page){
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
}

// Dibuja una línea en el recuadro de firma con el mouse (el canvas queda vacío si no se dibuja nada).
export async function firmar(page, selectorCanvas = "canvas#firmaCanvas"){
  const canvas = page.locator(selectorCanvas).first();
  await canvas.scrollIntoViewIfNeeded();
  const caja = await canvas.boundingBox();
  await page.mouse.move(caja.x + 20, caja.y + 20);
  await page.mouse.down();
  await page.mouse.move(caja.x + 100, caja.y + 60, { steps: 6 });
  await page.mouse.move(caja.x + 180, caja.y + 20, { steps: 6 });
  await page.mouse.up();
}

export function abrirPanelDesdeLista(page, consecutivo){
  return page.locator(".row", { hasText: consecutivo }).first().click();
}
