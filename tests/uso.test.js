import { describe, it, expect } from "vitest";
import { nivelUso, bytesLegibles, mensajeUso } from "../src/util/uso.js";

describe("uso del almacenamiento", () => {
  const MB = 1048576;
  it("avisa al 70 % y alerta al 90 %", () => {
    expect(nivelUso(100 * MB, 500 * MB).nivel).toBe("normal");
    expect(nivelUso(349 * MB, 500 * MB).nivel).toBe("normal");
    expect(nivelUso(350 * MB, 500 * MB).nivel).toBe("aviso");
    expect(nivelUso(449 * MB, 500 * MB).nivel).toBe("aviso");
    expect(nivelUso(450 * MB, 500 * MB).nivel).toBe("alerta");
  });
  it("no pasa del 100 % ni se rompe con límite cero", () => {
    expect(nivelUso(900 * MB, 500 * MB).pct).toBe(100);
    expect(nivelUso(5, 0)).toEqual({ pct: 0, nivel: "normal" });
  });
  it("muestra tamaños en unidades legibles", () => {
    expect(bytesLegibles(500)).toBe("500 B");
    expect(bytesLegibles(2048)).toBe("2 KB");
    expect(bytesLegibles(5 * MB)).toBe("5.0 MB");
    expect(bytesLegibles(1536 * MB)).toBe("1.50 GB");
  });
  it("solo hay mensaje cuando hace falta", () => {
    expect(mensajeUso("Archivos", "normal")).toBe("");
    expect(mensajeUso("Archivos", "aviso")).toContain("70 %");
    expect(mensajeUso("Archivos", "alerta")).toContain("90 %");
  });
});
