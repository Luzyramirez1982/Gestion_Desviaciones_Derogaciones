import { describe, it, expect } from "vitest";
import { cifrar, descifrar } from "../src/respaldo/cifrado.js";
import { archivosPendientes, listarTodo, rutaEnRespaldo } from "../src/respaldo/archivos.js";

const FRASE = "una-frase-larga-de-prueba-123";

describe("cifrado de respaldos", () => {
  it("lo cifrado se vuelve a abrir igual, y no se parece al original", () => {
    const original = Buffer.from("Registro MTC-001 · Descripción con ñ y tildes");
    const cif = cifrar(original, FRASE);
    expect(cif.includes(Buffer.from("MTC-001"))).toBe(false);
    expect(descifrar(cif, FRASE).equals(original)).toBe(true);
  });
  it("funciona con archivos vacíos y grandes", () => {
    for(const tam of [0, 1, 5 * 1048576]){
      const datos = Buffer.alloc(tam, 7);
      expect(descifrar(cifrar(datos, FRASE), FRASE).equals(datos)).toBe(true);
    }
  });
  it("el mismo contenido cifrado dos veces da archivos distintos", () => {
    const d = Buffer.from("igual");
    expect(cifrar(d, FRASE).equals(cifrar(d, FRASE))).toBe(false);
  });
  it("con una contraseña equivocada no se abre", () => {
    expect(() => descifrar(cifrar(Buffer.from("x"), FRASE), "otra-frase-larga-distinta")).toThrow(/contraseña es incorrecta/);
  });
  it("si el archivo se altera, se detecta", () => {
    const cif = cifrar(Buffer.from("contenido importante"), FRASE);
    cif[cif.length - 1] ^= 1;
    expect(() => descifrar(cif, FRASE)).toThrow(/dañado/);
  });
  it("rechaza archivos que no son respaldos y contraseñas cortas", () => {
    expect(() => descifrar(Buffer.from("texto cualquiera sin formato de respaldo, de más de cuarenta y ocho bytes"), FRASE)).toThrow(/no es un respaldo válido/);
    expect(() => descifrar(Buffer.alloc(3), FRASE)).toThrow(/no es un respaldo válido/);
    expect(() => cifrar(Buffer.from("x"), "corta")).toThrow(/al menos 16/);
  });
});

describe("qué archivos copiar", () => {
  it("solo los que todavía no están en el respaldo", () => {
    const remotos = ["registros/MTC-001/a.pdf", "registros/MTC-001/b.pdf", "firmas/u1/f.png"];
    const existentes = [rutaEnRespaldo("registros/MTC-001/a.pdf")];
    expect(archivosPendientes(remotos, existentes)).toEqual(["registros/MTC-001/b.pdf", "firmas/u1/f.png"]);
    expect(archivosPendientes(remotos, remotos.map(rutaEnRespaldo))).toEqual([]);
    expect(archivosPendientes([], existentes)).toEqual([]);
  });
});

describe("listar archivos por carpetas", () => {
  // Imita a Supabase Storage: las carpetas no traen "id".
  const arbol = {
    "": [{ name: "registros" }, { name: "firmas" }],
    "registros": [{ name: "MTC-001" }],
    "registros/MTC-001": [{ name: "a.pdf", id: "1" }, { name: "b.pdf", id: "2" }],
    "firmas": [{ name: "u1" }],
    "firmas/u1": [{ name: "f.png", id: "3" }],
  };
  const storage = { from: () => ({ list: async (carpeta) => ({ data: arbol[carpeta] || [], error: null }) }) };

  it("recorre todas las carpetas y devuelve solo archivos", async () => {
    expect((await listarTodo(storage, "archivos")).sort()).toEqual(["firmas/u1/f.png", "registros/MTC-001/a.pdf", "registros/MTC-001/b.pdf"]);
  });
  it("si falla, avisa dónde", async () => {
    const roto = { from: () => ({ list: async () => ({ data: null, error: { message: "sin permiso" } }) }) };
    await expect(listarTodo(roto, "archivos")).rejects.toThrow(/No se pudo listar "\/": sin permiso/);
  });
});
