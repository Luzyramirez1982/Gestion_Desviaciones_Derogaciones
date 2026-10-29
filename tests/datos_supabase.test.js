// El adaptador Supabase de la aplicación, probado contra las funciones reales de la base (PGlite).
import { describe, it, expect, beforeAll } from "vitest";
import { crearClientePglite } from "./cliente_pglite.js";
import { crearAdaptadorSupabase, errorDe } from "../src/datos/supabase.js";
import { filaARegistro, registroAData } from "../src/datos/convertir.js";
import { solicitud } from "./ayuda_bd.js";

const FIRMA = "data:image/png;base64,iVBORw0KGgo=";
let c, repo;
const entrar = (correo) => repo.iniciarSesion(correo, "x");
const datos = (o = {}) => ({ ...solicitud({ area: "Calidad Producto" }), ...o });

beforeAll(async () => {
  c = await crearClientePglite();
  await c.db.exec("insert into areas (nombre) values ('Calidad Producto'), ('Producción')");
  repo = crearAdaptadorSupabase(c.cliente);
});

describe("conversión de filas", () => {
  it("ida y vuelta del registro sin arrastrar datos de la base", () => {
    const rec = filaARegistro({ id: "MTC-001", tipo_gestion: "Derogación", area: "A", etapa: 1, version: 4, data: { foo: 1 },
      vigencia_inicio: "2026-01-01" }, { firmas: [{ espacio: "sol", nombre: "N", rol: "R", ruta_imagen: "firmas/x/y.png" }] });
    expect(rec).toMatchObject({ id: "MTC-001", stage: 1, version: 4, foo: 1, vigenciaInicio: "2026-01-01" });
    expect(rec.firmas.sol.ruta).toBe("firmas/x/y.png");
    const data = registroAData(rec);
    expect(data).toEqual({ foo: 1, tipoGestion: "Derogación", area: "A", reportadoPor: "", criticidad: "", vigenciaInicio: "2026-01-01" });
  });
});

describe("sesión", () => {
  it("rechaza credenciales malas y cuentas sin perfil", async () => {
    await expect(entrar("nadie@x.co")).rejects.toThrow("Correo o contraseña incorrectos.");
  });
  it("entra con perfil y lo devuelve en el formato de la app", async () => {
    const p = await entrar("calidad@x.co");
    expect(p).toMatchObject({ nombre: "Juan", rol: "Responsable del proceso", area: "Calidad Producto", activo: true });
    expect(await repo.sesionActual()).toMatchObject({ correo: "calidad@x.co" });
  });
  it("una cuenta desactivada no entra", async () => {
    await c.q("update perfiles set activo = false where correo = 'produccion@x.co'");
    await expect(entrar("produccion@x.co")).rejects.toThrow("desactivada");
    await c.q("update perfiles set activo = true where correo = 'produccion@x.co'");
  });
});

describe("flujo completo por funciones de la base", () => {
  let rec;
  it("crea una solicitud enviada, con firma subida a Storage", async () => {
    await entrar("calidad@x.co");
    rec = await repo.crearRegistro({ data: datos(), firma: FIRMA });
    expect(rec).toMatchObject({ id: "MTC-001", stage: 1, borrador: false, reportadoPor: "Juan" });
    expect(rec.firmas.sol.ruta).toMatch(/^firmas\/00000000-0000-0000-0000-000000000002\/.+\.png$/);
    expect(c.rutasSubidas).toHaveLength(1);
    expect(rec.bitacora[0].comentario).toBe("Solicitud creada y firmada.");
  });
  it("un borrador se guarda y se envía", async () => {
    const b = await repo.crearRegistro({ data: datos(), borrador: true });
    expect(b.id).toMatch(/^BOR-/);
    const g = await repo.guardarRegistro(b.id, b.version, { ...b, observaciones: "hola" });
    expect(g.version).toBe(b.version + 1);
    const e = await repo.enviarRegistro(b.id, g.version, g, FIRMA);
    expect(e.id).toBe("MTC-002");
    expect(e.stage).toBe(1);
  });
  it("el aprobador evalúa y firma; el dueño cierra", async () => {
    await entrar("aprobador@x.co");
    let r = await repo.cargarRegistro(rec.id);
    r = await repo.guardarRegistro(r.id, r.version, { ...r, conceptoEvaluacion: "Ok", controlesCompensatorios: "Inspección" });
    r = await repo.firmarEtapa(r.id, "aprob", FIRMA, "Aprobada");
    expect(r.stage).toBe(2);
    await expect(repo.firmarEtapa(r.id, "cierre", FIRMA)).rejects.toThrow();
    await entrar("calidad@x.co");
    r = await repo.cargarRegistro(rec.id);
    r = await repo.guardarRegistro(r.id, r.version, { ...r, observacionesCierre: "Listo", cumplimientoControl: "Sí" });
    r = await repo.firmarEtapa(r.id, "cierre", FIRMA);
    expect(r.cerrado).toBe(true);
    expect(Object.keys(r.firmas).sort()).toEqual(["aprob", "cierre", "sol"]);
  });
  it("devolver exige motivo y deja el registro como borrador devuelto", async () => {
    await entrar("aprobador@x.co");
    const lista = await repo.listarRegistros();
    const abierta = lista.find(r => r.id === "MTC-002");
    await expect(repo.devolverRegistro(abierta.id, " ")).rejects.toThrow("motivo");
    const d = await repo.devolverRegistro(abierta.id, "Falta información");
    expect(d).toMatchObject({ devuelta: true, borrador: true, stage: 0, motivoDevolucion: "Falta información" });
  });
  it("rechazar cierra la solicitud como Rechazada", async () => {
    await entrar("calidad@x.co");
    const n = await repo.crearRegistro({ data: datos(), firma: FIRMA });
    await entrar("aprobador@x.co");
    const r = await repo.rechazarRegistro(n.id, "No procede");
    expect(r).toMatchObject({ resultado: "Rechazada", cerrado: true });
  });
});

describe("permisos y errores", () => {
  it("otra área no ve el registro", async () => {
    await entrar("produccion@x.co");
    const lista = await repo.listarRegistros();
    expect(lista).toHaveLength(0);
    await expect(repo.cargarRegistro("MTC-001")).rejects.toThrow("No se encontró el registro.");
  });
  it("el conflicto de versión trae código propio y mensaje claro", async () => {
    await entrar("calidad@x.co");
    const n = await repo.crearRegistro({ data: datos(), borrador: true });
    await repo.guardarRegistro(n.id, n.version, n);
    const err = await repo.guardarRegistro(n.id, n.version, n).catch(e => e);
    expect(err.codigo).toBe("conflicto_version");
    expect(err.message).toMatch(/Otra persona cambió/);
  });
  it("errorDe traduce permisos y cortes de red", () => {
    expect(errorDe({ message: "permission denied for table x" }).message).toBe("No tiene permiso para hacer esto.");
    expect(errorDe({ message: "Failed to fetch" }).codigo).toBe("sin_conexion");
  });
  it("un responsable no puede eliminar ni ver el uso del espacio", async () => {
    await expect(repo.eliminarRegistro("MTC-001", "motivo largo")).rejects.toThrow();
    await expect(repo.usoAlmacenamiento()).rejects.toThrow("Solo el Administrador");
  });
});

describe("adjuntos, administración y huella", () => {
  it("sube un adjunto y entrega un enlace temporal", async () => {
    await entrar("calidad@x.co");
    const n = await repo.crearRegistro({ data: datos(), firma: FIRMA });
    const archivo = new File([new Uint8Array(100)], "Acta de reunión.pdf", { type: "application/pdf" });
    const a = await repo.subirAdjunto(n.id, archivo);
    expect(a.ruta).toBe(`registros/${n.id}/${a.ruta.split("/")[2]}`);
    expect(a.ruta).toMatch(/Acta_de_reunion\.pdf$/);
    expect((await repo.cargarRegistro(n.id)).adjuntos).toHaveLength(1);
    expect(await repo.urlArchivo(a.ruta)).toMatch(/^https:/);
    const grande = new File([new Uint8Array(6 * 1048576)], "grande.pdf", { type: "application/pdf" });
    await expect(repo.subirAdjunto(n.id, grande)).rejects.toThrow("5 MB");
  });
  it("el Administrador elimina con motivo y restaura; lee el uso del espacio", async () => {
    await entrar("admin@x.co");
    await repo.eliminarRegistro("MTC-001", "Duplicada en pruebas");
    const huellas = await repo.listarEliminados();
    expect(huellas[0]).toMatchObject({ registroId: "MTC-001", motivo: "Duplicada en pruebas", restaurado: false });
    const r = await repo.restaurarRegistro(huellas[0].id);
    expect(r.id).toBe("MTC-001");
    const uso = await repo.usoAlmacenamiento();
    expect(uso.archivos_limite_bytes).toBe(1024 * 1048576);
  });
  it("áreas, tipos y ajustes los cambia el Administrador", async () => {
    await repo.guardarArea("Nueva área");
    await repo.guardarTipo({ id: "t1", area: "Nueva área", nombre: "Tipo uno", desc: "algo" });
    await repo.renombrarArea("Nueva área", "Área renombrada");
    await repo.guardarConfig("enlace_acceso", { url: "https://x.pages.dev" });
    const base = await repo.cargarBase();
    expect(base.areas.map(a => a.nombre)).toContain("Área renombrada");
    expect(base.tipos.find(t => t.id === "t1")).toMatchObject({ area: "Área renombrada", nombre: "Tipo uno", desc: "algo" });
    expect(base.configuracion.enlace_acceso.url).toBe("https://x.pages.dev");
  });
  it("el Administrador cambia nombre, rol y área de una persona; un responsable no", async () => {
    const p = await repo.actualizarPerfil("00000000-0000-0000-0000-000000000003", { nombre: "Camila R.", rol: "Responsable del proceso", area: "Producción" });
    expect(p.nombre).toBe("Camila R.");
    await entrar("calidad@x.co");
    await expect(repo.actualizarPerfil("00000000-0000-0000-0000-000000000003", { nombre: "Hack", rol: "Administrador", area: "" })).rejects.toThrow();
  });
});
