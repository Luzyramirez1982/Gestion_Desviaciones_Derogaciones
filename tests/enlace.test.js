import { describe, it, expect } from "vitest";
import { direccionPublicada, enlaceValido } from "../src/util/enlace.js";
import { correoDeAviso, mensajeAcceso, destinatariosEtapa } from "../src/dominio/mensajes.js";

describe("enlace de acceso", () => {
  it("toma la dirección publicada y descarta lo que no es público", () => {
    expect(direccionPublicada("https://matec.pages.dev/index.html#/panel")).toBe("https://matec.pages.dev/");
    expect(direccionPublicada("https://matec.pages.dev/app/?x=1")).toBe("https://matec.pages.dev/app/");
    expect(direccionPublicada("http://matec.pages.dev/")).toBe("");
    expect(direccionPublicada("http://localhost:5173/")).toBe("");
    expect(direccionPublicada("https://localhost/")).toBe("");
    expect(direccionPublicada("https://192.168.1.5/")).toBe("");
    expect(direccionPublicada("file:///C:/app/index.html")).toBe("");
    expect(direccionPublicada("")).toBe("");
  });
  it("solo guarda enlaces https", () => {
    expect(enlaceValido("")).toBe("");
    expect(enlaceValido("https://x.pages.dev")).toBe("https://x.pages.dev");
    expect(enlaceValido("javascript:alert(1)")).toBeNull();
    expect(enlaceValido("http://x.co")).toBeNull();
    expect(enlaceValido("no es un enlace")).toBeNull();
  });
});

describe("textos de correo", () => {
  const perfiles = [
    { id: "a", nombre: "Ana", correo: "ana@x.co", rol: "Aprobador autorizado", activo: true },
    { id: "b", nombre: "Beto", correo: "beto@x.co", rol: "Aprobador autorizado", activo: false },
    { id: "c", nombre: "Cata", correo: "cata@x.co", rol: "Responsable del proceso", activo: true },
    { id: "d", nombre: "Dani", correo: "dani@x.co", rol: "Administrador", activo: true },
  ];
  const rec = { id: "MTC-001", tipoGestion: "Desviación", area: "Producción", stage: 1, reportadoPorId: "c", reportadoPor: "Cata", criticidad: "Menor" };
  it("en evaluación avisa solo a Aprobadores activos; en cierre, a quien hizo la solicitud", () => {
    expect(destinatariosEtapa(rec, perfiles).map(p => p.id)).toEqual(["a"]);
    expect(destinatariosEtapa({ ...rec, stage: 2 }, perfiles).map(p => p.id)).toEqual(["c"]);
    expect(destinatariosEtapa(rec, perfiles.filter(p => p.rol !== "Aprobador autorizado")).map(p => p.id)).toEqual(["d"]);
  });
  it("el correo de aviso lleva el consecutivo y está codificado", () => {
    const m = correoDeAviso(rec, perfiles);
    expect(m.startsWith("mailto:ana@x.co?subject=")).toBe(true);
    expect(decodeURIComponent(m)).toContain("MTC-001");
  });
  it("el mensaje de acceso incluye la clave temporal solo si existe", () => {
    const base = { nombre: "Eva", correo: "eva@x.co", rol: "Aprobador autorizado", area: "" };
    expect(mensajeAcceso({ ...base, clave: "Abc12345#" }, "https://x.pages.dev/", "Ana")).toContain("Contraseña temporal: Abc12345#");
    expect(mensajeAcceso(base, "", "Ana")).not.toContain("temporal:");
  });
});
