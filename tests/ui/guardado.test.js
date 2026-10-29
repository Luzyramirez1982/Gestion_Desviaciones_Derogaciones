// Guardado confiable en la pantalla: indicador de estado, error con «Reintentar», conflicto de versión
// con «Recargar registro» y aviso al cerrar la pestaña con cambios sin guardar.
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { simularCanvas, montarApp, ingresar, hasta, clic, escribir, esperar } from "./ayuda_ui.js";

beforeAll(simularCanvas);
let app;
beforeEach(async () => { app = await montarApp(); });

async function abrirComoAprobador(id = "MTC-001"){
  await ingresar(app, "aprobador");
  clic([...app.raiz.querySelectorAll(".nav button")].find(b => b.textContent.includes("Registros")));
  await esperar(5);
  clic([...app.raiz.querySelectorAll(".row")].find(r => r.textContent.includes(id)));
  await hasta(() => app.raiz.querySelector("#panelBox"), "el detalle");
}
const estado = () => app.raiz.querySelector("#estadoGuardado");

describe("indicador de guardado", () => {
  it("pasa por «Cambios sin guardar», «Guardando» y «Guardado»", async () => {
    await abrirComoAprobador();
    escribir(app.raiz.querySelector('[data-campo="conceptoEvaluacion"]'), "Primer texto");
    expect(estado().textContent).toContain("Cambios sin guardar");
    await hasta(() => estado().textContent.includes("Guardado"), "ver «Guardado»", 150);
    expect((await app.repo.cargarRegistro("MTC-001")).conceptoEvaluacion).toBe("Primer texto");
  });

  it("si falla, muestra el error con «Reintentar» y al reintentar guarda", async () => {
    await abrirComoAprobador();
    const original = app.repo.guardarRegistro;
    let falla = true;
    app.repo.guardarRegistro = async (...a) => { if(falla) throw new Error("No se pudo guardar. Intente de nuevo."); return original(...a); };
    escribir(app.raiz.querySelector('[data-campo="conceptoEvaluacion"]'), "Texto que no se pudo guardar");
    await hasta(() => estado().textContent.includes("Error al guardar"), "ver el error", 150);
    expect(app.ctx.pendientes.size).toBe(1);
    falla = false;
    clic(estado().querySelector("[data-reintentar]"));
    await hasta(() => estado().textContent.includes("Guardado"), "guardar al reintentar", 150);
    expect((await app.repo.cargarRegistro("MTC-001")).conceptoEvaluacion).toBe("Texto que no se pudo guardar");
  });

  it("una caída de conexión se reintenta sola", async () => {
    await abrirComoAprobador();
    const original = app.repo.guardarRegistro;
    let intentos = 0;
    app.repo.guardarRegistro = async (...a) => {
      if(++intentos === 1) throw Object.assign(new Error("No hay conexión con el servidor."), { codigo: "sin_conexion" });
      return original(...a);
    };
    escribir(app.raiz.querySelector('[data-campo="conceptoEvaluacion"]'), "Se guarda al segundo intento");
    await hasta(() => estado().textContent.includes("Error al guardar"), "ver el error de conexión", 150);
    expect(estado().title).toContain("reintentará solo");
    await hasta(() => estado().textContent.includes("Guardado"), "reintento automático", 400);
    expect(intentos).toBe(2);
  });
});

describe("conflicto de versión", () => {
  it("avisa, no sobrescribe lo de la otra persona y permite recargar", async () => {
    await abrirComoAprobador();
    // Otra persona (el Administrador, en otra sesión) cambia el mismo registro mientras éste está abierto.
    const otro = app.repo.guardarRegistro;
    const rec = await app.repo.cargarRegistro("MTC-001");
    await otro("MTC-001", rec.version, { ...rec, conceptoEvaluacion: "Texto de la otra persona", controlesCompensatorios: "Control de la otra persona" });
    escribir(app.raiz.querySelector('[data-campo="observacionesAprobacion"]'), "Mi texto, escrito con la versión vieja");
    await hasta(() => estado().textContent.includes("Alguien más cambió"), "ver el conflicto", 150);
    expect(app.raiz.querySelector("#avisoConflicto").style.display).toBe("flex");
    expect((await app.repo.cargarRegistro("MTC-001")).observacionesAprobacion).toBeFalsy();     // no se pisó nada
    clic(app.raiz.querySelector("#avisoConflicto [data-recargar-registro]"));
    await hasta(() => app.raiz.querySelector('[data-campo="conceptoEvaluacion"]')?.value === "Texto de la otra persona", "ver lo de la otra persona", 100);
    expect(estado().textContent).not.toContain("Alguien más");
  });

  it("firmar con cambios sin guardar que chocan no firma", async () => {
    await abrirComoAprobador();
    const rec = await app.repo.cargarRegistro("MTC-001");
    await app.repo.guardarRegistro("MTC-001", rec.version, { ...rec, observacionesAprobacion: "Otra persona" });
    escribir(app.raiz.querySelector('[data-campo="conceptoEvaluacion"]'), "Aprobado");
    app.raiz.querySelector("#firmaCanvas").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    clic(app.raiz.querySelector("#btnFirmar"));
    await hasta(() => document.querySelector(".aviso-error"), "aviso", 100);
    expect((await app.repo.cargarRegistro("MTC-001")).stage).toBe(1);
  });
});

describe("cerrar la pestaña", () => {
  it("avisa si hay cambios sin guardar y no avisa si todo está guardado", async () => {
    await abrirComoAprobador();
    const intento = () => { const e = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };
    expect(intento()).toBe(false);
    escribir(app.raiz.querySelector('[data-campo="conceptoEvaluacion"]'), "Sin guardar todavía");
    expect(intento()).toBe(true);
    await hasta(() => estado().textContent.includes("Guardado"), "guardar", 150);
    expect(intento()).toBe(false);
  });
});
