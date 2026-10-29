import { describe, it, expect } from "vitest";
import { dimensionesMaximas, esFotoComprimible, nombreComprimido, revisarArchivos } from "../src/util/imagen.js";

const archivo = (name, size) => ({ name, size });

describe("compresión de fotos", () => {
  it("achica sin deformar y nunca agranda", () => {
    expect(dimensionesMaximas(4000, 3000)).toEqual({ ancho: 1600, alto: 1200, cambia: true });
    expect(dimensionesMaximas(3000, 4000)).toEqual({ ancho: 1200, alto: 1600, cambia: true });
    expect(dimensionesMaximas(800, 600)).toEqual({ ancho: 800, alto: 600, cambia: false });
    expect(dimensionesMaximas(1600, 1600).cambia).toBe(false);
  });
  it("solo comprime fotos comunes", () => {
    expect(esFotoComprimible("image/jpeg")).toBe(true);
    expect(esFotoComprimible("image/png")).toBe(true);
    expect(esFotoComprimible("image/gif")).toBe(false);
    expect(esFotoComprimible("application/pdf")).toBe(false);
  });
  it("cambia la extensión según el formato nuevo", () => {
    expect(nombreComprimido("foto.PNG", "image/webp")).toBe("foto.webp");
    expect(nombreComprimido("sin_extension", "image/jpeg")).toBe("sin_extension.jpg");
  });
});

describe("límites de archivos", () => {
  it("rechaza vacíos y los de más de 5 MB, con el motivo", () => {
    const r = revisarArchivos([archivo("a.pdf", 100), archivo("b.pdf", 0), archivo("c.pdf", 6 * 1048576)]);
    expect(r.validos.map(a => a.name)).toEqual(["a.pdf"]);
    expect(r.rechazados.map(x => x.motivo)).toEqual(["El archivo está vacío.", "Pesa más de 5 MB."]);
  });
  it("acepta exactamente 5 MB", () => {
    expect(revisarArchivos([archivo("a.pdf", 5 * 1048576)]).validos).toHaveLength(1);
  });
  it("máximo 10 por cargue y 50 por registro", () => {
    const doce = Array.from({ length: 12 }, (_, i) => archivo(`f${i}.pdf`, 10));
    const r = revisarArchivos(doce);
    expect(r.validos).toHaveLength(10);
    expect(r.rechazados).toHaveLength(2);
    expect(r.rechazados[0].motivo).toContain("10 archivos");
    const r2 = revisarArchivos(doce.slice(0, 5), { yaHay: 48 });
    expect(r2.validos).toHaveLength(2);
    expect(r2.rechazados[0].motivo).toContain("50 archivos");
  });
});
