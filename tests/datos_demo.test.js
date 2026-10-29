// El adaptador de demostración debe cumplir las mismas reglas básicas que la base de datos.
import { describe, it, expect, beforeEach } from "vitest";
import { crearAdaptadorDemo } from "../src/datos/demo.js";
import { crearRepositorio } from "../src/datos/repositorio.js";
import { CLAVE_DEMO } from "../src/datos/ejemplo.js";

const FIRMA = "data:image/png;base64,AAAA";
let repo;
const entrar = (c) => repo.iniciarSesion(c + "@ejemplo.test", CLAVE_DEMO);
const form = (o = {}) => ({ tipoGestion: "Desviación", area: "Calidad Producto", criticidad: "Menor", ...o });
beforeEach(() => { repo = crearAdaptadorDemo(); });

describe("repositorio", () => {
  it("mientras no haya base de datos conectada arranca en modo demostración", async () => {
    expect((await crearRepositorio("")).demo).toBe(true);   // sin dirección de Neon, aunque el .env tenga una
  });
});

describe("sesión", () => {
  it("rechaza claves malas y acepta las de demostración", async () => {
    await expect(repo.iniciarSesion("admin@ejemplo.test", "mala")).rejects.toThrow("incorrectos");
    expect((await entrar("admin")).rol).toBe("Administrador");
  });
  it("sin sesión no se lee nada", async () => {
    await expect(repo.listarRegistros()).rejects.toThrow("iniciar sesión");
  });
});

describe("visibilidad", () => {
  it("un responsable ve solo su área y el aprobador ve todo", async () => {
    await entrar("produccion");
    expect((await repo.listarRegistros()).map(r => r.id)).toEqual(["MTC-002"]);
    await expect(repo.cargarRegistro("MTC-001")).rejects.toThrow("No se encontró");
    await entrar("aprobador");
    expect(await repo.listarRegistros()).toHaveLength(3);
  });
});

describe("flujo", () => {
  it("crear, evaluar, firmar y cerrar", async () => {
    await entrar("calidad");
    let r = await repo.crearRegistro({ data: form(), firma: FIRMA });
    expect(r).toMatchObject({ id: "MTC-004", stage: 1 });
    await entrar("aprobador");
    await expect(repo.firmarEtapa(r.id, "aprob", FIRMA)).rejects.toThrow("Antes de firmar complete");
    r = await repo.guardarRegistro(r.id, r.version, { ...r, conceptoEvaluacion: "ok", controlesCompensatorios: "ok" });
    r = await repo.firmarEtapa(r.id, "aprob", FIRMA);
    expect(r.stage).toBe(2);
    await expect(repo.firmarEtapa(r.id, "cierre", FIRMA)).rejects.toThrow();
    await entrar("calidad");
    r = await repo.guardarRegistro(r.id, r.version, { ...r, observacionesCierre: "ok", cumplimientoControl: "ok" });
    r = await repo.firmarEtapa(r.id, "cierre", FIRMA);
    expect(r.cerrado).toBe(true);
    await expect(repo.guardarRegistro(r.id, r.version, r)).rejects.toThrow("cerrado");
  });
  it("devolver y rechazar exigen motivo; devolver deja un borrador reenviable", async () => {
    await entrar("aprobador");
    await expect(repo.devolverRegistro("MTC-001", "")).rejects.toThrow("motivo");
    const d = await repo.devolverRegistro("MTC-001", "Falta evidencia");
    expect(d).toMatchObject({ devuelta: true, stage: 0 });
    await entrar("calidad");
    const e = await repo.enviarRegistro("MTC-001", d.version, d, FIRMA);
    expect(e).toMatchObject({ devuelta: false, stage: 1 });
    await entrar("aprobador");
    const x = await repo.rechazarRegistro("MTC-001", "No procede");
    expect(x.resultado).toBe("Rechazada");
  });
  it("el conflicto de versión se avisa y no sobrescribe", async () => {
    await entrar("calidad");
    const b = await repo.crearRegistro({ data: form(), borrador: true });
    await repo.guardarRegistro(b.id, b.version, { ...b, nota: "a" });
    const err = await repo.guardarRegistro(b.id, b.version, { ...b, nota: "b" }).catch(e => e);
    expect(err.codigo).toBe("conflicto_version");
    expect((await repo.cargarRegistro(b.id)).nota).toBe("a");
  });
  it("sin firma no se envía, y retroceder es solo del Administrador", async () => {
    await entrar("calidad");
    await expect(repo.crearRegistro({ data: form() })).rejects.toThrow("firma");
    await entrar("aprobador");
    await expect(repo.retrocederEtapa("MTC-002")).rejects.toThrow("Solo el Administrador");
    await entrar("admin");
    expect((await repo.retrocederEtapa("MTC-002")).stage).toBe(1);
  });
});

describe("administración", () => {
  it("eliminar deja huella y restaurar la usa; el aprobador no puede", async () => {
    await entrar("aprobador");
    await expect(repo.eliminarRegistro("MTC-001", "motivo largo")).rejects.toThrow();
    await entrar("admin");
    await expect(repo.eliminarRegistro("MTC-001", "no")).rejects.toThrow("motivo");
    await repo.eliminarRegistro("MTC-001", "Prueba de eliminación");
    const [h] = await repo.listarEliminados();
    await repo.restaurarRegistro(h.id);
    await expect(repo.restaurarRegistro(h.id)).rejects.toThrow("ya fue restaurado");
  });
  it("siempre queda un Administrador activo y se crean cuentas con clave temporal", async () => {
    await entrar("admin");
    await expect(repo.cambiarActivo("u-admin", false)).rejects.toThrow();
    const n = await repo.crearUsuario({ nombre: "Nueva Persona", correo: "NUEVA@ejemplo.test", rol: "Aprobador autorizado", area: "" });
    expect(n.clave.length).toBeGreaterThanOrEqual(8);
    const p = await repo.iniciarSesion("nueva@ejemplo.test", n.clave);
    expect(p.debeCambiarClave).toBe(true);
  });
  it("renombrar un área actualiza registros y personas", async () => {
    await entrar("admin");
    await repo.renombrarArea("Producción", "Planta");
    const base = await repo.cargarBase();
    expect(base.areas.some(a => a.nombre === "Planta")).toBe(true);
    expect(base.perfiles.find(p => p.id === "u-prod").area).toBe("Planta");
    expect((await repo.cargarRegistro("MTC-002")).area).toBe("Planta");
  });
  it("avisa a quien escucha cuando algo cambia", async () => {
    await entrar("admin");
    let n = 0;
    const cancelar = repo.suscribir(() => n++);
    await repo.retrocederEtapa("MTC-002");
    cancelar();
    await repo.convertirADerogacion("MTC-001");
    expect(n).toBe(1);
  });
});
