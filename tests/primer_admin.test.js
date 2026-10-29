import { describe, it, expect } from "vitest";
import { validarEntradas, leerOpciones, crearPrimerAdmin, catalogoInicial } from "../src/admin/primerAdmin.js";

const env = { SUPABASE_URL: "https://abcdefgh.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "clave-de-servidor" };
const buenas = { nombre: "Ana Pérez", correo: "ANA@Empresa.com", proyecto: "abcdefgh" };
const azar = (n) => 1 % n;

describe("entradas del script", () => {
  it("acepta datos buenos y normaliza el correo", () => {
    expect(validarEntradas(buenas, env)).toEqual({ ok: true, datos: { nombre: "Ana Pérez", correo: "ana@empresa.com" } });
  });
  it("rechaza lo que falta o es dudoso, con un mensaje claro", () => {
    expect(validarEntradas({ ...buenas, nombre: "A" }, env).error).toContain("--nombre");
    expect(validarEntradas({ ...buenas, correo: "no-es-correo" }, env).error).toContain("--correo");
    expect(validarEntradas(buenas, { ...env, SUPABASE_URL: "" }).error).toContain("SUPABASE_URL");
    expect(validarEntradas(buenas, { ...env, SUPABASE_URL: "http://x.supabase.co" }).error).toContain("https://");
    expect(validarEntradas(buenas, { ...env, SUPABASE_SERVICE_ROLE_KEY: "" }).error).toContain("SERVICE_ROLE");
    expect(validarEntradas({ ...buenas, proyecto: undefined }, env).error).toContain("--proyecto");
  });
  it("no crea nada si el proyecto indicado no es el de la URL", () => {
    expect(validarEntradas({ ...buenas, proyecto: "otroproyecto" }, env).error).toContain("no coincide");
  });
  it("lee las opciones de la línea de comandos", () => {
    expect(leerOpciones(["--nombre", "Ana Pérez", "--sin-catalogo", "--correo", "a@b.co"])).toEqual({ nombre: "Ana Pérez", "sin-catalogo": true, correo: "a@b.co" });
  });
});

// Cliente simulado: anota lo que se hace y permite fallar a propósito.
function simulado({ admins = [], hayAreas = [], falla = {} } = {}){
  const llamadas = [];
  const tabla = (nombre) => {
    const q = { filtros: [] };
    const b = {
      select(){ return b; }, eq(){ return b; },
      limit: async () => ({ data: nombre === "perfiles" ? admins : hayAreas, error: falla.consulta || null }),
      insert: async (v) => { llamadas.push(["insert", nombre, v]); return { error: falla[nombre] || null }; },
    };
    return b;
  };
  return {
    llamadas,
    from: tabla,
    auth: { admin: {
      createUser: async (d) => { llamadas.push(["createUser", d]); return falla.auth ? { data: null, error: falla.auth } : { data: { user: { id: "uid-1" } }, error: null }; },
      deleteUser: async (id) => { llamadas.push(["deleteUser", id]); },
    } },
  };
}

describe("catálogo inicial", () => {
  it("cada tipo tiene un identificador propio y su área existe", () => {
    const { areas, tipos } = catalogoInicial();
    expect(new Set(tipos.map(t => t.id)).size).toBe(tipos.length);
    const nombres = new Set(areas.map(a => a.nombre));
    expect(tipos.every(t => nombres.has(t.area))).toBe(true);
  });
});

describe("crear el primer Administrador", () => {
  it("crea la cuenta con clave temporal, el perfil y el catálogo inicial", async () => {
    const sb = simulado();
    const r = await crearPrimerAdmin(sb, { nombre: "Ana Pérez", correo: "ana@empresa.com" }, { azar });
    expect(r.clave).toHaveLength(10);
    expect(r.sembrado.areas).toBe(catalogoInicial().areas.length);
    const crear = sb.llamadas.find(l => l[0] === "createUser")[1];
    expect(crear).toMatchObject({ email: "ana@empresa.com", email_confirm: true, password: r.clave });
    const perfil = sb.llamadas.find(l => l[0] === "insert" && l[1] === "perfiles")[2];
    expect(perfil).toMatchObject({ id: "uid-1", rol: "Administrador", activo: true, debe_cambiar_clave: true });
    expect(JSON.stringify(sb.llamadas)).not.toContain("service_role");
  });
  it("se niega si ya hay un Administrador activo y no crea nada", async () => {
    const sb = simulado({ admins: [{ id: "x" }] });
    await expect(crearPrimerAdmin(sb, { nombre: "Ana Pérez", correo: "a@b.co" }, { azar })).rejects.toThrow("Ya existe un Administrador activo");
    expect(sb.llamadas).toHaveLength(0);
  });
  it("si falla el perfil, borra la cuenta para no dejarla sin perfil", async () => {
    const sb = simulado({ falla: { perfiles: { message: "boom" } } });
    await expect(crearPrimerAdmin(sb, { nombre: "Ana Pérez", correo: "a@b.co" }, { azar })).rejects.toThrow("No se creó la cuenta");
    expect(sb.llamadas.some(l => l[0] === "deleteUser" && l[1] === "uid-1")).toBe(true);
  });
  it("avisa claro si el correo ya existe o si faltan las migraciones", async () => {
    await expect(crearPrimerAdmin(simulado({ falla: { auth: { message: "User already registered" } } }), { nombre: "Ana Pérez", correo: "a@b.co" }, { azar })).rejects.toThrow("Ya existe una cuenta con ese correo");
    await expect(crearPrimerAdmin(simulado({ falla: { consulta: { message: "relation does not exist" } } }), { nombre: "Ana Pérez", correo: "a@b.co" }, { azar })).rejects.toThrow("migraciones");
  });
  it("no vuelve a sembrar si ya hay áreas, ni cuando se pide omitirlo", async () => {
    const con = simulado({ hayAreas: [{ nombre: "Producción" }] });
    expect((await crearPrimerAdmin(con, { nombre: "Ana Pérez", correo: "a@b.co" }, { azar })).sembrado).toEqual({ areas: 0, tipos: 0 });
    const sin = simulado();
    await crearPrimerAdmin(sin, { nombre: "Ana Pérez", correo: "a@b.co" }, { azar, sembrarCatalogo: false });
    expect(sin.llamadas.some(l => l[1] === "areas")).toBe(false);
  });
});
