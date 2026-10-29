// El adaptador Neon de la aplicación, probado contra las funciones reales de la base (PGlite).
// Lo que hace el servicio de ingreso de Neon se imita en tests/cliente_pglite.js.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { crearClientePglite } from "./cliente_pglite.js";
import { crearAdaptadorNeon, errorDe, claveTemporal } from "../src/datos/neon.js";
import { filaARegistro, registroAData } from "../src/datos/convertir.js";
import { validarClave } from "../src/auth/clave.js";
import { traducirErrorAuth } from "../src/auth/errores.js";
import { solicitud } from "./ayuda_bd.js";
import { crearAlmacenFuncion } from "../src/datos/almacen.js";
import { tokenDeSesion } from "../src/datos/tokenNeon.js";
import { crearEntornoArchivos, URL_FUNCION } from "./entorno_archivos.js";

const FIRMA = "data:image/png;base64,iVBORw0KGgo=";
let c, repo;
// El adaptador usa la cadena completa de archivos: aplicación -> función -> base de datos -> bucket.
const adaptador = (cliente = c.cliente) => crearAdaptadorNeon(cliente, crearAlmacenFuncion(URL_FUNCION, () => tokenDeSesion(c.cliente)), { esperaMs: 0 });
let entorno;
afterAll(() => entorno && entorno.quitar());
const entrar = (correo, clave = "x") => repo.iniciarSesion(correo, clave);
const datos = (o = {}) => ({ ...solicitud({ area: "Calidad Producto" }), ...o });

beforeAll(async () => {
  c = await crearClientePglite();
  await c.db.exec("insert into areas (nombre) values ('Calidad Producto'), ('Producción')");
  entorno = crearEntornoArchivos(c);   // la función «archivos» de verdad, con bucket simulado
  entorno.instalar();
  repo = adaptador();
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
    await expect(entrar("calidad@x.co", "mala")).rejects.toThrow("Correo o contraseña incorrectos.");
  });
  it("una cuenta de ingreso sin perfil en la aplicación no entra", async () => {
    c.cuentas.set("suelta@x.co", { id: "cuenta-suelta", clave: "x", nombre: "Suelta", bloqueada: false });
    await expect(entrar("suelta@x.co")).rejects.toThrow("no está registrado");
    expect(await repo.sesionActual()).toBeNull();
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
  it("al cerrar sesión ya no hay sesión", async () => {
    await entrar("calidad@x.co");
    await repo.cerrarSesion();
    expect(await repo.sesionActual()).toBeNull();
  });
});

describe("flujo completo por funciones de la base", () => {
  let rec;
  it("crea una solicitud enviada, con la firma guardada en la base", async () => {
    await entrar("calidad@x.co");
    rec = await repo.crearRegistro({ data: datos(), firma: FIRMA });
    expect(rec).toMatchObject({ id: "MTC-001", stage: 1, borrador: false, reportadoPor: "Juan" });
    expect(rec.firmas.sol.ruta).toMatch(/^firmas\/00000000-0000-0000-0000-000000000002\/.+\.png$/);
    expect(await c.q("select ruta from archivos where ruta = $1", [rec.firmas.sol.ruta])).toHaveLength(1);
    expect(entorno.bucket.has(rec.firmas.sol.ruta)).toBe(true);   // la imagen de la firma está en el bucket
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
  it("errorDe traduce permisos, cortes de red y sesión vencida", () => {
    expect(errorDe({ message: "permission denied for table x" }).message).toBe("No tiene permiso para hacer esto.");
    expect(errorDe({ message: "Failed to fetch" }).codigo).toBe("sin_conexion");
    expect(errorDe({ message: "JWT expired" }).codigo).toBe("sesion_vencida");
  });
  it("un responsable no puede eliminar ni ver el uso del espacio", async () => {
    await expect(repo.eliminarRegistro("MTC-001", "motivo largo")).rejects.toThrow();
    await expect(repo.usoAlmacenamiento()).rejects.toThrow("Solo el Administrador");
  });
});

describe("adjuntos, administración y huella", () => {
  it("sube un adjunto y entrega un enlace para abrirlo", async () => {
    await entrar("calidad@x.co");
    const n = await repo.crearRegistro({ data: datos(), firma: FIRMA });
    const archivo = new File([new Uint8Array(100)], "Acta de reunión.pdf", { type: "application/pdf" });
    const a = await repo.subirAdjunto(n.id, archivo);
    expect(a.ruta).toBe(`registros/${n.id}/${a.ruta.split("/")[2]}`);
    expect(a.ruta).toMatch(/Acta_de_reunion\.pdf$/);
    expect((await repo.cargarRegistro(n.id)).adjuntos).toHaveLength(1);
    const url = await repo.urlArchivo(a.ruta);
    expect(url).toMatch(/^blob:/);
    const blob = await (await fetch(url)).blob();
    expect(blob.size).toBe(100);
    expect(blob.type).toBe("application/pdf");
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
    expect(uso.archivos_limite_bytes).toBe(5 * 1024 * 1048576);
    expect(uso.archivos_bytes).toBeGreaterThan(0);
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

describe("personas y contraseñas", () => {
  let nueva;
  it("traduce los avisos de Neon (cuenta bloqueada, contraseña actual incorrecta)", () => {
    expect(traducirErrorAuth({ message: "You have been banned from this application. Please contact support" })).toMatch(/desactivada/);
    expect(traducirErrorAuth({ message: "Invalid password" })).toMatch(/contraseña actual/);
    expect(traducirErrorAuth({ message: "Invalid email or password" })).toBe("Correo o contraseña incorrectos.");
  });
  it("la contraseña temporal cumple las reglas de la aplicación", () => {
    for(let i = 0; i < 50; i++){
      const clave = claveTemporal();
      expect(validarClave(clave, clave), clave).toBe("");
    }
  });
  it("el Administrador crea una cuenta: queda en el servicio de ingreso y anotada en la aplicación", async () => {
    await entrar("admin@x.co");
    nueva = await repo.crearUsuario({ nombre: "Laura Gómez", correo: " Laura@X.co ", rol: "Responsable del proceso", area: "Producción" });
    expect(nueva.correo).toBe("laura@x.co");
    expect(nueva.clave).toBeTruthy();
    expect(c.cuentas.get("laura@x.co").clave).toBe(nueva.clave);
    const base = await repo.cargarBase();
    expect(base.perfiles.find(p => p.id === nueva.id)).toMatchObject({ nombre: "Laura Gómez", rol: "Responsable del proceso", area: "Producción", debeCambiarClave: true });
  });
  it("si no se puede anotar a la persona, la cuenta de ingreso no queda suelta", async () => {
    await expect(repo.crearUsuario({ nombre: "Sin área", correo: "sinarea@x.co", rol: "Responsable del proceso", area: "" })).rejects.toThrow("debe tener un área");
    expect(c.cuentas.has("sinarea@x.co")).toBe(false);
  });
  it("un responsable no puede crear cuentas", async () => {
    await entrar("calidad@x.co");
    await expect(repo.crearUsuario({ nombre: "X", correo: "x2@x.co", rol: "Aprobador autorizado", area: "" })).rejects.toThrow("Solo el Administrador");
    expect(c.cuentas.has("x2@x.co")).toBe(false);
  });
  it("la persona nueva entra con la temporal y la cambia por la suya", async () => {
    const p = await entrar("laura@x.co", nueva.clave);
    expect(p.debeCambiarClave).toBe(true);
    const despues = await repo.cambiarClave("MiClave2026");
    expect(despues.debeCambiarClave).toBe(false);
    await repo.cerrarSesion();
    await expect(entrar("laura@x.co", nueva.clave)).rejects.toThrow("Correo o contraseña incorrectos.");
    expect((await entrar("laura@x.co", "MiClave2026")).nombre).toBe("Laura Gómez");
  });
  it("si se recargó la página no se puede cambiar la contraseña sin volver a ingresar", async () => {
    const otro = adaptador();        // adaptador nuevo: no recuerda la contraseña usada
    await expect(otro.cambiarClave("OtraClave2026")).rejects.toThrow("ingrese de nuevo");
    expect(await otro.sesionActual()).toBeNull();
  });
  it("el Administrador restablece la contraseña y la persona debe cambiarla otra vez", async () => {
    await entrar("admin@x.co");
    const r = await repo.restablecerClave(nueva.id);
    expect(c.cuentas.get("laura@x.co").clave).toBe(r.clave);
    expect((await repo.cargarBase()).perfiles.find(p => p.id === nueva.id).debeCambiarClave).toBe(true);
  });
  it("desactivar bloquea el ingreso y activar lo libera", async () => {
    await repo.cambiarActivo(nueva.id, false);
    expect(c.cuentas.get("laura@x.co").bloqueada).toBe(true);
    await repo.cambiarActivo(nueva.id, true);
    expect(c.cuentas.get("laura@x.co").bloqueada).toBe(false);
  });
  it("no se puede desactivar al último Administrador", async () => {
    const admin = (await repo.cargarBase()).perfiles.find(p => p.rol === "Administrador");
    await expect(repo.cambiarActivo(admin.id, false)).rejects.toThrow("al menos un Administrador");
  });
  it("recuperar la contraseña por correo pide hablar con el Administrador (aún no hay pantalla de enlace)", async () => {
    await expect(repo.recuperarClave("laura@x.co")).rejects.toThrow("Administrador");
    expect(c.llamadas.some(l => l[0] === "recuperar")).toBe(false);
  });
});

describe("listas vacías por error de arranque de Neon", () => {
  // Cliente que, la primera vez que se le pide una tabla, responde "bien" pero sin filas (lo que se vio en Neon real).
  function conPrimeraVacia(cliente){
    const vistas = new Set();
    return { ...cliente, from(tabla){
      const b = cliente.from(tabla);
      if(vistas.has(tabla)) return b;
      vistas.add(tabla);
      return new Proxy(b, { get(t, k){ if(k === "then") return (ok, mal) => Promise.resolve({ data: t.__maybe ? null : [], error: null }).then(ok, mal);
        const v = t[k]; return typeof v === "function" ? (...a) => { if(k === "maybeSingle") t.__maybe = true; const r = v.apply(t, a); return r === t ? new Proxy(t, this) : r; } : v; } });
    } };
  }
  it("cargarBase reintenta y trae las áreas y los tipos aunque la primera respuesta llegue vacía", async () => {
    await entrar("admin@x.co");
    const flojo = adaptador(conPrimeraVacia(c.cliente));
    const base = await flojo.cargarBase();
    expect(base.areas.length).toBeGreaterThan(0);
    expect(base.tipos.length).toBeGreaterThanOrEqual(1);
    expect(base.perfiles.length).toBeGreaterThan(0);
  });
  it("una lista realmente vacía sigue devolviéndose vacía (no se queda esperando)", async () => {
    await entrar("admin@x.co");
    await c.q("delete from tipos");
    const t0 = Date.now();
    const base = await repo.cargarBase();
    expect(base.tipos).toEqual([]);
    expect(Date.now() - t0).toBeLessThan(3000);
  });
});

describe("archivos de punta a punta (aplicación → función → base → bucket)", () => {
  let n;
  it("un adjunto de exactamente 5 MB se sube, se anota y se abre igual; uno de 5 MB + 1 byte se rechaza", async () => {
    await entrar("calidad@x.co");
    n = await repo.crearRegistro({ data: datos(), firma: FIRMA });
    const justo = new File([new Uint8Array(5 * 1048576).fill(3)], "Maximo.pdf", { type: "application/pdf" });
    const a = await repo.subirAdjunto(n.id, justo);
    expect(entorno.bucket.get(a.ruta).bytes).toHaveLength(5 * 1048576);
    const blob = await (await fetch(await repo.urlArchivo(a.ruta))).blob();
    expect(blob.size).toBe(5 * 1048576);
    const pasado = new File([new Uint8Array(5 * 1048576 + 1)], "Pasado.pdf", { type: "application/pdf" });
    await expect(repo.subirAdjunto(n.id, pasado)).rejects.toThrow("5 MB");
  });
  it("un tipo de archivo peligroso lo rechaza la base y no queda en el bucket", async () => {
    const antes = entorno.bucket.size;
    const malo = new File([new Uint8Array(20)], "virus.exe", { type: "application/x-msdownload" });
    await expect(repo.subirAdjunto(n.id, malo)).rejects.toThrow("no está permitido");
    expect(entorno.bucket.size).toBe(antes);
  });
  it("otra área no puede abrir el adjunto ni subir uno a esa solicitud", async () => {
    const ruta = [...entorno.bucket.keys()].find(k => k.startsWith(`registros/${n.id}/`));
    await entrar("produccion@x.co");
    await expect(repo.urlArchivo(ruta)).rejects.toThrow("No se encontró el archivo");
    const f = new File([new Uint8Array(10)], "colado.pdf", { type: "application/pdf" });
    await expect(repo.subirAdjunto(n.id, f)).rejects.toThrow("No puede adjuntar");
  });
  it("sin sesión, la función rechaza y el adaptador avisa que la sesión venció", async () => {
    await repo.cerrarSesion();
    const f = new File([new Uint8Array(10)], "x.pdf", { type: "application/pdf" });
    await expect(repo.subirAdjunto(n.id, f)).rejects.toThrow("sesión venció");
  });
});

describe("permisos que la base niega por error al despertar", () => {
  // Cliente que, las primeras `n` veces que se llama a una función de la base, responde «no tiene permiso».
  function conNegacionesIniciales(cliente, n, mensaje){
    let quedan = n, llamadas = 0;
    return { cliente: { ...cliente, async rpc(nombre, args){ llamadas++; if(quedan-- > 0) return { data: null, error: { message: mensaje } }; return cliente.rpc(nombre, args); } },
      llamadas: () => llamadas };
  }
  it("crear una persona se reintenta y sale bien si la base solo se equivocó al despertar", async () => {
    await entrar("admin@x.co");
    const { cliente } = conNegacionesIniciales(c.cliente, 2, "Solo el Administrador puede dar de alta personas.");
    const r = await adaptador(cliente).crearUsuario({ nombre: "Tras Despertar", correo: "despertar@x.co", rol: "Aprobador autorizado", area: "" });
    expect(r.correo).toBe("despertar@x.co");
    expect((await repo.cargarBase()).perfiles.some(p => p.correo === "despertar@x.co")).toBe(true);
  });
  it("un permiso realmente negado sigue negado: se pregunta 3 veces y nada se ejecuta", async () => {
    await entrar("calidad@x.co");
    const f = conNegacionesIniciales(c.cliente, 99, "No puede adjuntar archivos a este registro.");
    await expect(adaptador(f.cliente).eliminarRegistro("MTC-001", "motivo largo")).rejects.toThrow("No puede adjuntar");
    expect(f.llamadas()).toBe(3);
  });
  it("los errores que no son de permiso no se reintentan", async () => {
    await entrar("calidad@x.co");
    const f = conNegacionesIniciales(c.cliente, 99, "Debe indicar el motivo.");
    await expect(adaptador(f.cliente).eliminarRegistro("MTC-001", "x")).rejects.toThrow("motivo");
    expect(f.llamadas()).toBe(1);
  });
});
