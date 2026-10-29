// Actualización en vivo: la lista se refresca sola cuando otra persona cambia algo, al volver a la pestaña,
// y no pisa lo que la persona está escribiendo.
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { simularCanvas, montarApp, ingresar, hasta, clic, escribir, esperar } from "./ayuda_ui.js";

beforeAll(simularCanvas);
let app;
beforeEach(async () => { app = await montarApp(); });

const irA = async (texto) => { clic([...app.raiz.querySelectorAll(".nav button")].find(b => b.textContent.includes(texto))); await esperar(5); };
const nuevoRegistro = () => app.repo.crearRegistro({ data: { tipoGestion: "Desviación", area: "Calidad Producto", criticidad: "Menor", tipoEspecifico: "Registro en vivo" }, firma: "data:image/png;base64,AAAA" });

describe("actualización en vivo", () => {
  it("un cambio de otra persona aparece en la lista sin recargar", async () => {
    await ingresar(app, "admin");
    await irA("Registros");
    expect(app.raiz.querySelector(".list").textContent).not.toContain("Registro en vivo");
    await nuevoRegistro();
    await hasta(() => app.raiz.querySelector(".list").textContent.includes("Registro en vivo"), "ver el registro nuevo", 120);
  });
  it("al volver a la pestaña se recarga", async () => {
    await ingresar(app, "admin");
    await irA("Registros");
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    app.ctx.detenerEnVivo();                       // se pierde la señal en vivo (por ejemplo, sin conexión)...
    await app.ctx.iniciarEnVivo();                  // ...y al volver la pestaña se vuelve a leer todo
    await nuevoRegistro();
    document.dispatchEvent(new Event("visibilitychange"));
    await hasta(() => app.raiz.querySelector(".list").textContent.includes("Registro en vivo"), "recarga al volver", 120);
  });
  it("no repinta el formulario: lo escrito se conserva", async () => {
    await ingresar(app, "admin");
    await irA("Nuevo registro");
    const form = await hasta(() => app.raiz.querySelector("#formNuevo"), "formulario");
    escribir(form.elements.proyecto, "Texto a medio escribir");
    await nuevoRegistro();
    await esperar(700);
    expect(app.raiz.querySelector("#formNuevo").elements.proyecto.value).toBe("Texto a medio escribir");
  });
  it("cerrar sesión deja de escuchar", async () => {
    await ingresar(app, "admin");
    let avisos = 0;
    const original = app.ctx.recargar;
    app.ctx.recargar = async (...a) => { avisos++; return original(...a); };
    app.raiz.querySelector("#btnSalir").click();
    await hasta(() => app.raiz.querySelector("#formIngreso"), "salir");
    await ingresar(app, "admin");
    avisos = 0;
    await nuevoRegistro();
    await esperar(600);
    expect(avisos).toBe(1);                         // una sola escucha activa, no dos
  });
});
