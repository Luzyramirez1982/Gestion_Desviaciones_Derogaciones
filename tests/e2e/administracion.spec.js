// Las pantallas que solo ve el Administrador: que carguen sin romperse y que las acciones
// principales (crear usuario, agregar tipo, renombrar área) funcionen de verdad.
import { test, expect } from "@playwright/test";
import { ingresar, CORREOS } from "./ayuda.js";

test.beforeEach(async ({ page }) => { await ingresar(page, CORREOS.admin); });

test("crear un usuario genera una contraseña temporal y lo deja en la lista", async ({ page }) => {
  await page.getByRole("button", { name: "Usuarios" }).click();
  await page.locator('#formUsuario [name="nombre"]').fill("Persona de Prueba E2E");
  await page.locator('#formUsuario [name="correo"]').fill("prueba.e2e@ejemplo.test");
  await page.locator('#formUsuario [name="rol"]').selectOption("Responsable del proceso");
  await page.locator('#formUsuario [name="area"]').selectOption("Producción");
  await page.getByRole("button", { name: "Crear usuario y generar acceso" }).click();

  await expect(page.getByText("Contraseña temporal lista")).toBeVisible();
  await expect(page.locator("#claveTemporal")).not.toBeEmpty();
  await expect(page.locator("table.simple").first()).toContainText("prueba.e2e@ejemplo.test");   // la tabla de usuarios es la primera; la de áreas va después
});

test("agregar y quitar un tipo de desviación en un área", async ({ page }) => {
  await page.getByRole("button", { name: "Tipos de desviación o derogación" }).click();
  const caja = page.locator('form[data-agregar-tipo="Producción"]');
  await caja.locator("input").fill("Tipo de prueba E2E");
  await caja.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText("Tipo agregado.")).toBeVisible();
  const chip = page.locator(".chip", { hasText: "Tipo de prueba E2E" });
  await expect(chip).toBeVisible();
  await chip.getByRole("button", { name: /Quitar/ }).click();
  await expect(page.getByText("Tipo eliminado.")).toBeVisible();
  await expect(chip).toHaveCount(0);
});

test("renombrar un área se refleja en la lista", async ({ page }) => {
  await page.getByRole("button", { name: "Usuarios" }).click();
  const fila = page.locator("#tarjetaAreas tr", { hasText: "Logística y Almacén" });
  await fila.getByRole("button", { name: "Editar" }).click();
  await page.locator("#entradaArea").fill("Logística y Almacén (E2E)");
  await page.locator("#tarjetaAreas").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("#tarjetaAreas")).toContainText("Logística y Almacén (E2E)");
});

test("registros eliminados: lista vacía al empezar", async ({ page }) => {
  await page.getByRole("button", { name: "Registros eliminados" }).click();
  await expect(page.getByText("No se han eliminado registros.")).toBeVisible();
});

test("uso del almacenamiento: ya no menciona a Supabase y muestra las barras", async ({ page }) => {
  await page.getByRole("button", { name: "Uso del almacenamiento" }).click();
  await expect(page.getByText("Base de datos", { exact: true })).toBeVisible();
  await expect(page.getByText("Archivos (adjuntos y firmas)")).toBeVisible();
  await expect(page.getByText("Supabase")).toHaveCount(0);
});

test("el instructivo carga completo, por rol y con el detalle del 8D", async ({ page }) => {
  await page.getByRole("button", { name: "Instructivo" }).click();
  await expect(page.getByText("¿Qué es este aplicativo?")).toBeVisible();
  await expect(page.getByText("Alcance del Aprobador autorizado")).toBeVisible();
  await expect(page.getByText("Herramientas del 8D (resumen)")).toBeVisible();
});
