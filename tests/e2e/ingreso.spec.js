import { test, expect } from "@playwright/test";
import { campo, ingresar, salir, CORREOS } from "./ayuda.js";

test.describe("ingreso", () => {
  test("se ve el aviso de modo demostración y la lista de cuentas", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Modo demostración.")).toBeVisible();
    await expect(page.getByRole("link", { name: CORREOS.admin, exact: false })).toBeVisible();
  });

  test("correo o contraseña incorrectos muestran un aviso y no entran", async ({ page }) => {
    await page.goto("/");
    await campo(page, "correo").fill(CORREOS.admin);
    await campo(page, "clave").fill("clave-mala");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  });

  test("entra como Administrador y puede salir", async ({ page }) => {
    await ingresar(page, CORREOS.admin);
    await expect(page.getByText("Administrador", { exact: true })).toBeVisible();
    await salir(page);
  });

  test("un enlace de cuenta de ejemplo rellena el formulario", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: CORREOS.calidad, exact: false }).click();
    await expect(campo(page, "correo")).toHaveValue(CORREOS.calidad);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });
});
