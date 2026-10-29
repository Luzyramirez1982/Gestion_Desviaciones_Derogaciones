import { describe, it, expect } from "vitest";
import { crearGuardador, textoEstado } from "../src/util/guardador.js";

// Reloj de mentira: guarda lo programado y lo ejecuta cuando la prueba lo pide.
function reloj(){
  const cola = [];
  return {
    programar: (fn, ms) => { const t = { fn, ms }; cola.push(t); return t; },
    cancelar: (t) => { const i = cola.indexOf(t); if(i >= 0) cola.splice(i, 1); },
    async avanzar(){ const t = cola.shift(); if(!t) throw new Error("nada programado"); await t.fn(); await Promise.resolve(); await new Promise(r => setTimeout(r, 0)); },
    cola,
  };
}
const crear = (guardar, extra = {}) => {
  const r = reloj(), estados = [];
  const g = crearGuardador({ guardar, alEstado: (e) => estados.push(e), programar: r.programar, cancelar: r.cancelar, ...extra });
  return { g, r, estados };
};
const sinConexion = () => Object.assign(new Error("No hay conexión."), { codigo: "sin_conexion" });

describe("guardador", () => {
  it("junta varios cambios en un solo guardado", async () => {
    let n = 0;
    const { g, r, estados } = crear(async () => { n++; });
    g.marcar(); g.marcar(); g.marcar();
    expect(r.cola).toHaveLength(1);
    await r.avanzar();
    expect(n).toBe(1);
    expect(estados).toEqual(["pendiente", "pendiente", "pendiente", "guardando", "guardado"]);
  });
  it("si hay cambios mientras guarda, vuelve a guardar al terminar", async () => {
    let n = 0, g;
    const { g: g2, r } = crear(async () => { n++; if(n === 1) g.marcar(); });
    g = g2;
    g.marcar();
    await r.avanzar();
    expect(n).toBe(2);
    expect(g.estado).toBe("guardado");
  });
  it("reintenta solo cuando se cae la conexión, con espera creciente", async () => {
    let n = 0;
    const { g, r } = crear(async () => { n++; if(n < 3) throw sinConexion(); });
    g.marcar();
    await r.avanzar();
    expect(g.estado).toBe("error");
    expect(r.cola[0].ms).toBe(1500);
    await r.avanzar();
    expect(r.cola[0].ms).toBe(4000);
    await r.avanzar();
    expect(g.estado).toBe("guardado");
    expect(n).toBe(3);
  });
  it("después de agotar los reintentos deja el error y permite reintentar a mano", async () => {
    let falla = true;
    const { g, r } = crear(async () => { if(falla) throw sinConexion(); }, { esperas: [10] });
    g.marcar();
    await r.avanzar(); await r.avanzar();
    expect(g.estado).toBe("error");
    expect(r.cola).toHaveLength(0);
    expect(g.hayPendientes()).toBe(true);
    falla = false;
    await g.reintentar();
    expect(g.estado).toBe("guardado");
    expect(g.hayPendientes()).toBe(false);
  });
  it("un error que no es de conexión no se reintenta solo", async () => {
    const { g, r } = crear(async () => { throw new Error("El registro ya está cerrado."); });
    g.marcar();
    await r.avanzar();
    expect(g.estado).toBe("error");
    expect(g.mensaje).toBe("El registro ya está cerrado.");
    expect(r.cola).toHaveLength(0);
  });
  it("el conflicto de versión frena todo hasta recargar", async () => {
    let n = 0;
    const { g, r } = crear(async () => { n++; throw Object.assign(new Error("Otra persona lo cambió."), { codigo: "conflicto_version" }); });
    g.marcar();
    await r.avanzar();
    expect(g.estado).toBe("conflicto");
    g.marcar();
    expect(await g.ahora()).toBe(false);
    expect(n).toBe(1);
    g.reiniciar();
    expect(g.estado).toBe("inactivo");
  });
  it("ahora() guarda de inmediato y no hace nada si no hay cambios", async () => {
    let n = 0;
    const { g, r } = crear(async () => { n++; });
    expect(await g.ahora()).toBe(true);
    expect(n).toBe(0);
    g.marcar();
    expect(await g.ahora()).toBe(true);
    expect(n).toBe(1);
    expect(r.cola).toHaveLength(0);
  });
  it("tiene un texto para cada estado", () => {
    expect(textoEstado("guardando")).toBe("Guardando…");
    expect(textoEstado("error")).toBe("Error al guardar");
    expect(textoEstado("inactivo")).toBe("");
  });
});
