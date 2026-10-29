// La política de seguridad publicada en Cloudflare Pages no debe aflojarse sin querer.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const texto = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
const csp = texto.split("\n").find(l => l.trim().startsWith("Content-Security-Policy:")).split(":").slice(1).join(":").trim();
const directiva = (n) => (csp.split(";").map(d => d.trim()).find(d => d.startsWith(n + " ")) || "").split(/\s+/).slice(1);

describe("cabeceras de seguridad", () => {
  it("los scripts solo vienen de la propia aplicación, sin unsafe-inline ni unsafe-eval", () => {
    expect(directiva("script-src")).toEqual(["'self'"]);
    expect(csp).not.toContain("unsafe-eval");
    expect(directiva("style-src")).toEqual(["'self'"]);
  });
  it("nadie puede enmarcar la aplicación y no se permiten objetos", () => {
    expect(directiva("frame-ancestors")).toEqual(["'none'"]);
    expect(directiva("object-src")).toEqual(["'none'"]);
    expect(directiva("base-uri")).toEqual(["'self'"]);
    expect(texto).toContain("X-Frame-Options: DENY");
  });
  it("solo se conecta a sí misma y a Neon", () => {
    expect(directiva("connect-src")).toEqual(["'self'", "https://*.neon.tech"]);
    expect(directiva("default-src")).toEqual(["'self'"]);
  });
  it("trae las demás cabeceras", () => {
    expect(texto).toContain("X-Content-Type-Options: nosniff");
    expect(texto).toContain("Referrer-Policy:");
  });
  it("Vite lo copia a la carpeta publicada y el documento de ajuste existe", () => {
    expect(existsSync(new URL("../docs/CABECERAS.md", import.meta.url))).toBe(true);
    expect(existsSync(new URL("../public/_headers", import.meta.url))).toBe(true);
  });
});
