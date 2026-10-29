import { describe, it, expect } from "vitest";
import { todayISO, nowLocal, daysUntil } from "../src/util/fechas.js";
import { esc, urlSegura } from "../src/util/html.js";
import { emptyD8, d8Faltantes, is8DComplete } from "../src/dominio/d8.js";
import {
  canSignSlot, requisitosFirma, visibleRecords, validarVigencia, vigenciaTexto, estadoTexto, pendingSlots,
} from "../src/dominio/registro.js";
import { FIRMA_SLOTS } from "../src/dominio/constantes.js";

const slot = (k) => FIRMA_SLOTS.find(s => s.key === k);
const resp = { id: "u3", nombre: "Juan", rol: "Responsable del proceso", area: "Calidad Producto" };
const otroResp = { id: "u7", nombre: "Camila", rol: "Responsable del proceso", area: "Producción" };
const aprob = { id: "u4", nombre: "Carlos", rol: "Aprobador autorizado", area: "" };
const admin = { id: "u1", nombre: "Natalia", rol: "Administrador", area: "" };

function d8Completo(){
  const d = emptyD8();
  ["d1", "d4", "d6", "d7", "d8"].forEach(k => d[k] = "x");
  Object.keys(d.w2h).forEach(k => d.w2h[k] = "x");
  d.whys = ["a", "b", "c", "", ""];
  d.contencion = [{ accion: "a", puntoControl: "b", fecha: "2026-10-01", responsable: "c" }];
  d.correctivas = [{ causa: "a", accion: "b", fecha: "2026-10-01", responsable: "c" }];
  return d;
}

describe("fechas en hora de Colombia", () => {
  it("a las 8 p. m. en Bogotá (01:00 UTC del día siguiente) sigue siendo el mismo día", () => {
    const now = new Date("2026-10-29T01:00:00Z"); // 28/10 20:00 en Bogotá
    expect(todayISO(0, now)).toBe("2026-10-28");
    expect(nowLocal(now)).toBe("2026-10-28T20:00");
  });
  it("aplica desplazamientos de días y cruza el fin de mes", () => {
    const now = new Date("2026-10-31T15:00:00Z");
    expect(todayISO(1, now)).toBe("2026-11-01");
    expect(todayISO(-31, now)).toBe("2026-09-30");
  });
  it("daysUntil cuenta días de calendario", () => {
    const now = new Date("2026-10-29T01:00:00Z");
    expect(daysUntil("2026-10-28", now)).toBe(0);
    expect(daysUntil("2026-10-30", now)).toBe(2);
    expect(daysUntil("2026-10-27", now)).toBe(-1);
    expect(daysUntil("", now)).toBeNull();
  });
});

describe("seguridad del HTML", () => {
  it("esc neutraliza etiquetas y comillas", () => {
    expect(esc(`<img src=x onerror="a()">`)).toBe("&lt;img src=x onerror=&quot;a()&quot;&gt;");
    expect(esc(null)).toBe("");
  });
  it("urlSegura rechaza javascript: y data:text/html", () => {
    expect(urlSegura("javascript:alert(1)")).toBe("");
    expect(urlSegura("data:text/html;base64,PHNjcmlwdD4=")).toBe("");
    expect(urlSegura("data:image/svg+xml;base64,AAAA")).toBe("");
  });
  it("urlSegura acepta https, blob e imágenes/PDF en base64", () => {
    expect(urlSegura("https://x.supabase.co/a.png")).toBe("https://x.supabase.co/a.png");
    expect(urlSegura("blob:https://app/123")).toBe("blob:https://app/123");
    expect(urlSegura("data:image/png;base64,iVBORw0=")).toBe("data:image/png;base64,iVBORw0=");
    expect(urlSegura("data:application/pdf;base64,JVBERi0=")).toBe("data:application/pdf;base64,JVBERi0=");
  });
});

describe("8D", () => {
  it("un 8D vacío lista todo lo que falta", () => {
    const f = d8Faltantes(emptyD8());
    expect(f.some(x => x.startsWith("D2 · 5W2H"))).toBe(true);
    expect(f.some(x => x.startsWith("D4 · 5 Porqués"))).toBe(true);
    expect(f.some(x => x.includes("D3 · Acciones de contención (registre al menos una)"))).toBe(true);
  });
  it("un 8D completo no tiene faltantes", () => {
    expect(d8Faltantes(d8Completo())).toEqual([]);
  });
  it("una fila de D3 a medias se reporta", () => {
    const d = d8Completo();
    d.contencion.push({ accion: "solo acción", puntoControl: "", fecha: "", responsable: "" });
    expect(d8Faltantes(d).join()).toContain("fila 2");
  });
  it("solo las derogaciones exigen el 8D", () => {
    expect(is8DComplete({ tipoGestion: "Desviación", d8: emptyD8() })).toBe(true);
    expect(is8DComplete({ tipoGestion: "Derogación", d8: emptyD8() })).toBe(false);
    expect(is8DComplete({ tipoGestion: "Derogación", d8: d8Completo() })).toBe(true);
  });
});

describe("firmas por etapa", () => {
  const rec = (o) => ({ id: "MTC-001", stage: 1, reportadoPorId: "u3", reportadoPor: "Juan", firmas: {}, ...o });

  it("solo el Aprobador firma la evaluación, y solo en esa etapa", () => {
    expect(canSignSlot(aprob, rec(), slot("aprob"))).toBe(true);
    expect(canSignSlot(resp, rec(), slot("aprob"))).toBe(false);
    expect(canSignSlot(admin, rec(), slot("aprob"))).toBe(false);
    expect(canSignSlot(aprob, rec({ stage: 2 }), slot("aprob"))).toBe(false);
  });
  it("cierra solo quien hizo la solicitud", () => {
    expect(canSignSlot(resp, rec({ stage: 2 }), slot("cierre"))).toBe(true);
    expect(canSignSlot(otroResp, rec({ stage: 2 }), slot("cierre"))).toBe(false);
  });
  it("la firma de la solicitud no se toma desde el detalle", () => {
    expect(canSignSlot(resp, rec({ stage: 0 }), slot("sol"))).toBe(false);
  });
  it("nadie firma un registro cerrado o rechazado; el Administrador puede dar visto bueno", () => {
    expect(canSignSlot(aprob, rec({ cerrado: true }), slot("aprob"))).toBe(false);
    expect(canSignSlot(aprob, rec({ resultado: "Rechazada" }), slot("aprob"))).toBe(false);
    expect(canSignSlot(admin, rec({ stage: 2 }), slot("admin"))).toBe(true);
  });
  it("aprobar exige concepto, controles y, en derogaciones, el 8D completo", () => {
    expect(requisitosFirma(rec(), slot("aprob")).length).toBe(2);
    const ok = rec({ conceptoEvaluacion: "ok", controlesCompensatorios: "ok" });
    expect(requisitosFirma(ok, slot("aprob"))).toEqual([]);
    const der = { ...ok, tipoGestion: "Derogación", d8: emptyD8() };
    expect(requisitosFirma(der, slot("aprob")).join()).toContain("reporte 8D completo");
  });
  it("cerrar exige observaciones y cumplimiento de controles", () => {
    expect(requisitosFirma(rec({ stage: 2 }), slot("cierre")).length).toBe(2);
  });
  it("pendingSlots devuelve la firma de la etapa en curso", () => {
    expect(pendingSlots(rec())[0].key).toBe("aprob");
    expect(pendingSlots(rec({ firmas: { aprob: {} } }))).toEqual([]);
    expect(pendingSlots(rec({ borrador: true }))).toEqual([]);
  });
});

describe("visibilidad por rol", () => {
  const regs = [
    { id: "MTC-001", area: "Calidad Producto", reportadoPorId: "u3" },
    { id: "MTC-002", area: "Producción", reportadoPorId: "u7" },
    { id: "MTC-003", area: "Calidad Producto", reportadoPorId: "u9" },
    { id: "BOR-1", area: "Calidad Producto", reportadoPorId: "u3", borrador: true },
  ];
  it("el Responsable ve lo suyo y lo de su área, sin borradores", () => {
    expect(visibleRecords(resp, regs).map(r => r.id)).toEqual(["MTC-001", "MTC-003"]);
  });
  it("Aprobador y Administrador ven todo menos borradores", () => {
    expect(visibleRecords(aprob, regs).length).toBe(3);
    expect(visibleRecords(admin, regs).length).toBe(3);
  });
});

describe("vigencias", () => {
  it("la derogación temporal exige rango y que no sea inverso", () => {
    expect(validarVigencia({ tipoGestion: "Derogación", alcanceDerogacion: "Temporal" })).toMatch(/rango de fechas/);
    expect(validarVigencia({ tipoGestion: "Derogación", alcanceDerogacion: "Temporal", vigenciaInicio: "2026-10-10", vigenciaFin: "2026-10-01" })).toMatch(/no puede ser anterior/);
    expect(validarVigencia({ tipoGestion: "Derogación", alcanceDerogacion: "Temporal", vigenciaInicio: "2026-10-01", vigenciaFin: "2026-10-10" })).toBe("");
  });
  it("la definitiva exige fecha efectiva", () => {
    expect(validarVigencia({ tipoGestion: "Derogación", alcanceDerogacion: "Definitiva" })).toMatch(/efectiva/);
    expect(validarVigencia({ tipoGestion: "Derogación", alcanceDerogacion: "Definitiva", fechaEfectiva: "2026-11-01" })).toBe("");
  });
  it("las opciones «Otro» exigen texto", () => {
    expect(validarVigencia({ tipoGestion: "Desviación", temaOtro: true, tema: "" })).toMatch(/tema/);
    expect(validarVigencia({ tipoGestion: "Desviación", tipoEspecificoOtro: true, tipoEspecifico: "" })).toMatch(/tipo específico/);
  });
  it("textos de vigencia por figura", () => {
    expect(vigenciaTexto({ tipoGestion: "Derogación", alcanceDerogacion: "Definitiva", fechaEfectiva: "2026-11-01" })).toContain("Definitiva");
    expect(vigenciaTexto({ tipoGestion: "Derogación", alcanceDerogacion: "Temporal", vigenciaInicio: "a", vigenciaFin: "b" })).toBe("Temporal — del a a b");
    expect(vigenciaTexto({ tipoGestion: "Desviación", vigenciaInicio: "a", vigenciaFin: "b" })).toBe("a a b");
  });
});

describe("estado", () => {
  it("prioriza rechazada, cerrada y devuelta sobre la etapa", () => {
    expect(estadoTexto({ resultado: "Rechazada", stage: 1 })).toBe("Rechazada");
    expect(estadoTexto({ cerrado: true, stage: 2 })).toBe("Cerrada");
    expect(estadoTexto({ devuelta: true, stage: 0 })).toBe("Devuelta para ajustes");
    expect(estadoTexto({ stage: 1 })).toBe("Evaluación y Aprobación");
  });
});
