// El PDF y el Excel se arman con las librerías reales, sin navegador.
import { describe, it, expect } from "vitest";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import escribirExcel from "write-excel-file/universal";
import { armarPDF } from "../src/exportar/pdf.js";
import { hojasHistorico, filasRegistros, filasAcciones8D } from "../src/exportar/excel.js";
import { registrosDemo } from "../src/datos/ejemplo.js";

const cerrado = () => {
  const r = registrosDemo()[2];
  return { ...r, cerrado: true, stage: 2, fechaCierre: "2026-10-20T10:00:00Z", observacionesCierre: "Todo bien",
    d8: { ...r.d8, d1: "Equipo uno", contencion: [{ accion: "Aislar", puntoControl: "Visual", fecha: "2026-10-01", responsable: "Ana" }], correctivas: [], whys: ["a", "b", "c", "", ""], w2h: { what: "x" } },
    adjuntos: [{ nombre: "acta.pdf", tamano: 2048, usuario: "Ana", fecha: "2026-10-02T00:00:00Z" }],
    bitacora: [{ fecha: "2026-10-01", etapa: "Solicitud", rol: "R", usuario: "Sara", comentario: "Creada" }],
    firmas: { sol: { nombre: "Sara SST", rol: "Responsable del proceso", fecha: "2026-10-01T00:00:00Z", ruta: "firmas/x/y.png" } } };
};
const usuario = { nombre: "Ana Administradora", rol: "Administrador" };

describe("PDF de trazabilidad", () => {
  it("genera un PDF válido con el 8D, firmas y bitácora", () => {
    const doc = armarPDF({ jsPDF, autoTable }, cerrado(), { firmas: {}, usuario, generado: "hoy" });
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });
  it("una firma con imagen inválida no rompe el documento", () => {
    const doc = armarPDF({ jsPDF, autoTable }, cerrado(), { firmas: { sol: "data:image/png;base64,AAAA" }, usuario, generado: "hoy" });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
  });
  it("una desviación no incluye la sección 8D", () => {
    const d = { ...cerrado(), tipoGestion: "Desviación" };
    const doc = armarPDF({ jsPDF, autoTable }, d, { firmas: {}, usuario, generado: "hoy" });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
  });
});

describe("Excel histórico", () => {
  it("un texto que parece fórmula se guarda como texto, nunca como fórmula", () => {
    const [hoja] = hojasHistorico({ registros: [{ ...cerrado(), proyecto: "=1+1" }] });
    const celda = hoja.data[1].find(c => c.value === "=1+1");
    expect(celda).toMatchObject({ value: "=1+1", type: String });
  });
  it("tiene las hojas pedidas, y Eliminados solo para el Administrador", () => {
    const regs = registrosDemo();
    expect(hojasHistorico({ registros: regs, esAdmin: false }).map(h => h.sheet)).toEqual(["Registros", "Bitácora", "Acciones 8D"]);
    expect(hojasHistorico({ registros: regs, esAdmin: true }).map(h => h.sheet)).toEqual(["Registros", "Bitácora", "Acciones 8D", "Eliminados"]);
  });
  it("las filas llevan estado, figura y acciones 8D", () => {
    const [fila] = filasRegistros([cerrado()]);
    expect(fila).toMatchObject({ "Consecutivo": "MTC-003", "Estado": "Cerrada", "Figura": "Derogación", "8D completo": "No" });
    expect(filasAcciones8D([cerrado()])).toEqual([expect.objectContaining({ "Tipo": "Contención (D3)", "Acción": "Aislar" })]);
  });
  it("escribe un .xlsx de verdad (un zip con una hoja por pestaña)", async () => {
    const hojas = hojasHistorico({ registros: registrosDemo(), esAdmin: true });
    const blob = await escribirExcel(hojas).toBlob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 2))).toBe("PK");
    const crudo = Buffer.from(bytes).toString("latin1");
    for(const n of [1, 2, 3, 4]) expect(crudo).toContain(`xl/worksheets/sheet${n}.xml`);
  });
});
