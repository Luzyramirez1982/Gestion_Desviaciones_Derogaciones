// Convierte los datos de la versión anterior de la aplicación al modelo nuevo.
// Son funciones puras: reciben los datos viejos y devuelven lo que hay que guardar.
// No tocan ninguna base de datos (eso lo hace scripts/migrar-v1-a-v2.mjs), por eso se pueden probar.
import { AREA_SST, DEFAULT_AREAS, ROLES, TIPOS_GESTION } from "../dominio/constantes.js";
import { emptyActRow, emptyD8, emptyW2H } from "../dominio/d8.js";

const STAGE_EVAL = 1, STAGE_CIERRE = 2, MODELO_ACTUAL = 4;

// Nombres de áreas y de roles de versiones aún más antiguas.
export const AREA_MIGRATION = {
  "Calidad de producto": "Calidad Producto",
  "Diseño": "Ingeniería mecánica",
  "Automatización y control": "Ingeniería Automatización y Control",
};
export const migrateArea = (a) => AREA_MIGRATION[a] || a;

export const ROLE_MIGRATION = {
  "Solicitante": { rol: "Responsable del proceso" },
  "Líder de proceso": { rol: "Responsable del proceso" },
  "Líder de Calidad": { rol: "Responsable del proceso", area: "Calidad Producto" },
  "Líder de SST": { rol: "Responsable del proceso", area: AREA_SST },
  "Coordinador(a) SST": { rol: "Responsable del proceso", area: AREA_SST },
  "Responsable de ejecución": { rol: "Responsable del proceso" },
  "Responsable de seguimiento": { rol: "Responsable del proceso" },
};

const SST_PELIGROS = ["Biológico", "Físico", "Químico", "Psicosocial", "Biomecánico (ergonómico)", "Condiciones de seguridad", "Fenómenos naturales"];

// Tipos de archivo que admite el bucket (deben coincidir con 0004_almacenamiento.sql; hay una prueba que lo vigila).
export const MIME_PERMITIDOS = [
  "image/png", "image/jpeg", "image/webp", "application/pdf", "text/plain", "text/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

// ---------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------
const MESES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, sept: 8, oct: 9, nov: 10, dic: 11 };
const fechaValida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !isNaN(Date.parse(s + "T00:00:00Z"));

// La versión anterior guardaba fechas como "28 oct 2026, 7:30 p. m." (hora de Colombia). Devuelve ISO o null.
export function parsearFechaEs(texto){
  const t = String(texto || "").replace(/[\s  ]+/g, " ").trim();
  if(!t) return null;
  const m = t.match(/^(\d{1,2}) ([a-záéíóú]+)\.? (\d{4}),? (\d{1,2}):(\d{2}) ?([ap])\.? ?m\.?$/i);
  if(m){
    const mes = MESES[m[2].toLowerCase()];
    if(mes === undefined) return null;
    let h = Number(m[4]) % 12;
    if(m[6].toLowerCase() === "p") h += 12;
    return new Date(Date.UTC(Number(m[3]), mes, Number(m[1]), h + 5, Number(m[5]))).toISOString(); // Colombia = UTC-5, sin horario de verano
  }
  const iso = Date.parse(t);
  return isNaN(iso) ? null : new Date(iso).toISOString();
}

// "2026-10-28T19:30" (hora de Colombia, como la guardaba el formulario) → ISO.
function fechaHoraLocal(s){
  const m = String(s || "").match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if(!m || !fechaValida(m[1])) return null;
  return new Date(`${m[1]}T${m[2]}:00-05:00`).toISOString();
}

// ---------------------------------------------------------------
// Registros
// ---------------------------------------------------------------
// Pone un registro de cualquier versión anterior en el modelo 4 (igual que hacía normalizeRecord en index.html).
export function normalizarRegistroV1(original){
  const r = structuredClone(original);
  r.area = migrateArea(r.area);
  if(!r.firmas || typeof r.firmas !== "object") r.firmas = {};
  if(!r.firmas.sol && r.firmas["Solicitante"]) r.firmas.sol = r.firmas["Solicitante"];
  if(!r.firmas.sol && r.firmaSolicitante){
    r.firmas.sol = { nombre: r.reportadoPor, usuarioId: r.reportadoPorId || "",
      dataUrl: String(r.firmaSolicitante).indexOf("data:image") === 0 ? r.firmaSolicitante : "", fecha: r.firmaSolicitanteFecha || "" };
  }
  if(!r.modelo || r.modelo < 3){
    // Ciclo anterior de 8 etapas: 0-3 → Evaluación, 4 → Aprobación, 5-6 → Cierre (pendiente), 7 → Cierre (cerrado)
    const old = typeof r.stage === "number" ? r.stage : 0;
    const f = r.firmas;
    const nf = { sol: f.sol };
    const ev = f.s3 || f.s1 || f.s0 || f["Responsable del proceso"]; if(ev) nf.eval = ev;
    const ap = f.s4 || f["Aprobador autorizado"] || (r.firmaAprobador ? { nombre: r.firmaAprobador, usuarioId: "", dataUrl: "", fecha: r.firmaAprobadorFecha || "" } : null); if(ap) nf.aprob = ap;
    const ci = f.s6 || f["Responsable de seguimiento"]; if(ci) nf.cierre = ci;
    if(f.admin || f["Administrador"]) nf.admin = f.admin || f["Administrador"];
    r.firmas = nf;
    if(old >= 7 || r.resultado === "Rechazada") r.cerrado = true;
    if(!r.tema) r.tema = (r.relacionadoSST && r.area !== AREA_SST) ? AREA_SST : r.area;
    if(!r.conceptoEvaluacion) r.conceptoEvaluacion = [r.conceptoCalidad ? "Calidad: " + r.conceptoCalidad : "", r.conceptoSST ? "SST: " + r.conceptoSST : ""].filter(Boolean).join("\n");
    r.stage = old <= 3 ? 1 : old === 4 ? 2 : 3;
    r.modelo = 3;
  }
  if(r.modelo < 4){
    // Modelo 3 (Solicitud → Evaluación → Aprobación → Cierre) → modelo 4 (Solicitud → Evaluación y Aprobación → Cierre)
    const st = typeof r.stage === "number" ? r.stage : 1;
    r.stage = st >= 3 ? STAGE_CIERRE : STAGE_EVAL;
    if(r.firmas && r.firmas.eval){ r.firmas.evalAnterior = r.firmas.eval; delete r.firmas.eval; }
    r.modelo = MODELO_ACTUAL;
  }
  if(!r.tema) r.tema = r.area;
  r.relacionadoSST = r.area === AREA_SST || r.tema === AREA_SST;
  if(r.relacionadoSST && !r.peligroSST && SST_PELIGROS.includes(r.tipoEspecifico)) r.peligroSST = r.tipoEspecifico;
  if(r.cerrado === undefined) r.cerrado = false;
  ["responsableProceso", "responsableProcesoId", "conceptoEvaluacion", "observacionesAprobacion"].forEach(k => { if(r[k] === undefined) r[k] = ""; });
  if(r.borrador === undefined) r.borrador = false;
  if(r.devuelta === undefined) r.devuelta = false;
  if(!Array.isArray(r.adjuntos)) r.adjuntos = [];
  r.adjuntos = r.adjuntos.map(a => typeof a === "string" ? { nombre: a, tipo: "", tamano: 0, dataUrl: "", fecha: "", usuario: "" } : a);
  if(!Array.isArray(r.bitacora)) r.bitacora = [];
  if(!r.d8) r.d8 = emptyD8();
  if(!r.d8.w2h) r.d8.w2h = emptyW2H();
  if(!Array.isArray(r.d8.whys)) r.d8.whys = ["", "", "", "", ""];
  if(!Array.isArray(r.d8.contencion) || !r.d8.contencion.length) r.d8.contencion = [emptyActRow("d3")];
  if(!Array.isArray(r.d8.correctivas) || !r.d8.correctivas.length) r.d8.correctivas = [emptyActRow("d5")];
  if(!r.resultado) r.resultado = "";
  if(r.tipoGestion === "Derogación"){
    if(r.alcanceDerogacion !== "Definitiva" && r.alcanceDerogacion !== "Temporal") r.alcanceDerogacion = "Temporal";
    if(r.alcanceDerogacion === "Definitiva"){ if(!r.fechaEfectiva) r.fechaEfectiva = r.vigenciaInicio || ""; r.vigenciaFin = ""; }
  } else r.alcanceDerogacion = "";
  if(r.fechaEfectiva === undefined) r.fechaEfectiva = "";
  if(r.temaOtro === undefined) r.temaOtro = false;
  if(r.tipoEspecificoOtro === undefined) r.tipoEspecificoOtro = false;
  return r;
}

const mimeDe = (dataUrl) => (String(dataUrl).match(/^data:([^;,]+)[;,]/) || [])[1] || "";
const bytesDe = (dataUrl) => { const b64 = String(dataUrl).split(",")[1] || ""; return Math.floor(b64.length * 3 / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0); };

// Nombre de archivo seguro para Storage: sin tildes, sin espacios ni símbolos raros.
export function nombreSeguro(nombre){
  const limpio = String(nombre || "archivo").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._()-]+/g, "_").replace(/^[._]+/, "").replace(/_+/g, "_");
  const punto = limpio.lastIndexOf(".");
  const base = (punto > 0 ? limpio.slice(0, punto) : limpio).slice(0, 80) || "archivo";
  const ext = punto > 0 ? limpio.slice(punto).slice(0, 12) : "";
  return base + ext;
}

const buscarUsuario = (ctx, idV1, nombre) =>
  (ctx.usuarios || []).find(u => idV1 && u.idV1 === idV1) || (ctx.usuarios || []).find(u => nombre && u.nombre === nombre) || null;

// Convierte un registro de la versión anterior en las filas del modelo nuevo.
// ctx.usuarios: [{ idV1, authId, nombre }]  ·  ctx.ahora: fecha de respaldo cuando el dato viejo no tiene fecha.
export function convertirRegistro(original, ctx = {}){
  const avisos = [];
  const ahora = ctx.ahora || new Date().toISOString();
  const r = normalizarRegistroV1(original);
  const id = String(r.id || "").trim();
  const omitido = (motivo) => ({ fila: null, bitacora: [], firmas: [], adjuntos: [], avisos: [`${id || "(sin consecutivo)"}: ${motivo} Se omite.`] });
  if(!id) return omitido("no tiene consecutivo.");
  if(!TIPOS_GESTION.includes(r.tipoGestion)) return omitido(`la figura "${r.tipoGestion}" no es válida.`);

  const dueno = buscarUsuario(ctx, r.reportadoPorId, r.reportadoPor);
  if(!dueno) avisos.push(`${id}: no se encontró a quien la hizo ("${r.reportadoPor || ""}"); quedará sin dueño y solo la verán el Administrador, el Aprobador y su área.`);
  const creado = fechaHoraLocal(r.fechaHora) || ahora;
  const etapa = Math.min(Math.max(Number(r.stage) || 0, 0), STAGE_CIERRE);
  const cerrado = !!r.cerrado || r.resultado === "Rechazada";
  const fechaCierre = cerrado ? (parsearFechaEs(r.fechaCierre) || creado) : null;

  const data = { ...r };
  ["adjuntos", "firmas", "firmaSolicitante", "firmaSolicitanteFecha", "firmaAprobador", "firmaAprobadorFecha",
   "bitacora", "_migrado", "modelo", "fechaCierre"].forEach(k => delete data[k]);
  data.id = id;
  if(dueno) data.reportadoPorId = dueno.authId; else delete data.reportadoPorId;
  const resp = buscarUsuario(ctx, r.responsableProcesoId, r.responsableProceso);
  if(resp) data.responsableProcesoId = resp.authId; else delete data.responsableProcesoId;

  const fila = {
    id, tipo_gestion: r.tipoGestion, area: r.area || "", etapa,
    borrador: !!r.borrador, devuelta: !!r.devuelta, cerrado, resultado: r.resultado === "Rechazada" ? "Rechazada" : "",
    reportado_por_id: dueno ? dueno.authId : null, reportado_por: r.reportadoPor || "",
    criticidad: r.criticidad || "",
    vigencia_inicio: fechaValida(r.vigenciaInicio) ? r.vigenciaInicio : null,
    vigencia_fin: fechaValida(r.vigenciaFin) ? r.vigenciaFin : null,
    version: 1, data, fecha_cierre: fechaCierre, creado_en: creado, actualizado_en: ahora,
  };
  if(!fila.area) avisos.push(`${id}: no tiene área.`);

  const bitacora = r.bitacora.map((b, i) => ({
    id: i + 1, registro_id: id, etapa: b.etapa || "", rol: b.rol || "", usuario: b.usuario || "",
    fecha: fechaValida(b.fecha) ? b.fecha : creado.slice(0, 10), comentario: b.comentario || "", creado_en: creado,
  }));

  const firmas = [];
  for(const espacio of ["sol", "aprob", "cierre", "admin"]){
    const f = r.firmas[espacio];
    if(!f) continue;
    const u = buscarUsuario(ctx, f.usuarioId, f.nombre);
    const imagen = String(f.dataUrl || "").indexOf("data:image/") === 0 ? f.dataUrl : "";
    firmas.push({
      registro_id: id, espacio, usuario_id: u ? u.authId : null, nombre: f.nombre || "", rol: f.rol || "",
      ruta_imagen: imagen ? `firmas/migracion/${id}-${espacio}.png` : "", fecha: parsearFechaEs(f.fecha) || creado, imagen,
    });
  }

  const adjuntos = [];
  r.adjuntos.forEach((a, i) => {
    if(!a.dataUrl){ avisos.push(`${id}: el adjunto "${a.nombre}" no tiene contenido guardado; se omite.`); return; }
    const mime = mimeDe(a.dataUrl);
    if(!MIME_PERMITIDOS.includes(mime)){ avisos.push(`${id}: el adjunto "${a.nombre}" es de un tipo no permitido (${mime || "desconocido"}); se omite y debe conservarse aparte.`); return; }
    adjuntos.push({
      registro_id: id, nombre: a.nombre, tipo: mime, tamano: a.tamano || bytesDe(a.dataUrl), ruta: `registros/${id}/${i + 1}-${nombreSeguro(a.nombre)}`,
      subido_por: a.usuario || "", creado_en: parsearFechaEs(a.fecha) || creado, dataUrl: a.dataUrl,
    });
  });
  if(firmas.length === 0 && !fila.borrador && etapa >= 1) avisos.push(`${id}: está enviada pero no tiene la firma de la solicitud.`);

  return { fila, bitacora, firmas, adjuntos, avisos };
}

// ---------------------------------------------------------------
// Personas, áreas y tipos
// ---------------------------------------------------------------
export function convertirUsuarios(usuariosV1, authUsers){
  const authPorCorreo = new Map((authUsers || []).map(a => [String(a.email || "").toLowerCase(), a.id]));
  const perfiles = [], sinCuenta = [], usuarios = [], avisos = [];
  for(const u of usuariosV1){
    const m = ROLE_MIGRATION[u.rol];
    const rol = m ? m.rol : u.rol;
    const area = migrateArea(u.area || m?.area || "");
    if(!ROLES.includes(rol)){ avisos.push(`${u.nombre || u.id}: el rol "${u.rol}" no es válido; se omite.`); continue; }
    const authId = authPorCorreo.get(String(u.correo || "").toLowerCase());
    if(!authId){ sinCuenta.push({ nombre: u.nombre, correo: u.correo, rol, area }); continue; }
    perfiles.push({ id: authId, nombre: u.nombre, correo: String(u.correo).toLowerCase(), rol, area, activo: true, debe_cambiar_clave: !!u.debeCambiarClave });
    usuarios.push({ idV1: u.id, authId, nombre: u.nombre, correo: u.correo });
  }
  if(!perfiles.some(p => p.rol === "Administrador")) avisos.push("Ninguna persona migrada es Administrador: hay que crear el primer Administrador antes de usar la aplicación.");
  return { perfiles, sinCuenta, usuarios, avisos };
}

export function convertirAreas(configAreas, registros, perfiles, tiposV1){
  const base = Array.isArray(configAreas) && configAreas.length ? configAreas.map(migrateArea) : DEFAULT_AREAS.slice();
  const lista = [...new Set(base)];
  const usadas = [...registros.map(r => r.area), ...perfiles.map(p => p.area), ...tiposV1.map(t => migrateArea(t.area))].filter(Boolean);
  for(const a of usadas) if(!lista.includes(a)) lista.push(a);
  return lista.map((nombre, orden) => ({ nombre, orden }));
}

export const convertirTipos = (tiposV1) => tiposV1.map(t => ({
  id: t.id, area: migrateArea(t.area), nombre: t.data?.nombre || "", data: { desc: t.data?.desc || "" },
}));

// ---------------------------------------------------------------
// Huella de registros eliminados
// ---------------------------------------------------------------
export function convertirHuella(h, ctx = {}){
  const conv = convertirRegistro(h.copia, ctx);
  if(!conv.fila) return { fila: null, firmas: [], avisos: conv.avisos.map(a => `Huella ${h.id}: ${a}`) };
  const quien = buscarUsuario(ctx, h.eliminadoPorId, h.eliminadoPor);
  const avisos = conv.avisos.map(a => `Huella ${h.id}: ${a}`);
  if(h.copia?.adjuntos?.length) avisos.push(`Huella ${h.id}: los archivos adjuntos de ${h.registroId} no se guardaron en la versión anterior y no se pueden restaurar.`);
  const sinImagen = conv.firmas.map(({ imagen, ...f }) => f);
  const fila = {
    registro_id: h.registroId, eliminado_por_id: quien ? quien.authId : null, eliminado_por: h.eliminadoPor || "",
    correo: h.eliminadoPorCorreo || "", rol: h.rol || "", motivo: h.motivo || "(sin motivo)",
    copia: { registro: conv.fila, bitacora: conv.bitacora, firmas: sinImagen, adjuntos: [] },
    restaurado: !!h.restaurado, restaurado_por: h.restauradoPor || "", restaurado_en: parsearFechaEs(h.restauradoEl),
    creado_en: h.fechaISO && !isNaN(Date.parse(h.fechaISO)) ? new Date(h.fechaISO).toISOString() : (ctx.ahora || new Date().toISOString()),
  };
  return { fila, firmas: conv.firmas.filter(f => f.imagen), avisos };
}

// ---------------------------------------------------------------
// Todo junto
// ---------------------------------------------------------------
// exportacion: las filas tal como salen de Supabase (cada una con { id, data, ... }) y la lista de cuentas de acceso.
export function planificar(exportacion, { ahora = new Date().toISOString() } = {}){
  const filas = (t) => exportacion[t] || [];
  const usr = convertirUsuarios(filas("usuarios").map(f => ({ id: f.id, ...f.data })), exportacion.auth_users);
  const ctx = { usuarios: usr.usuarios, ahora };

  const registros = filas("registros").map(f => convertirRegistro({ id: f.id, ...f.data }, ctx));
  const huellas = filas("registros_eliminados").map(f => convertirHuella(f.data, ctx));
  const tiposV1 = filas("tipos_desviacion");
  const areasCfg = filas("configuracion").find(f => f.id === "areas")?.data?.areas;
  const appCfg = filas("configuracion").find(f => f.id === "app")?.data;

  const registrosOk = registros.filter(r => r.fila);
  const areas = convertirAreas(areasCfg, registrosOk.map(r => r.fila), usr.perfiles, tiposV1);

  // El consecutivo continúa después del número más alto, incluyendo los registros eliminados (no se reutilizan).
  const numeros = [...registrosOk.map(r => r.fila.id), ...huellas.filter(h => h.fila).map(h => h.fila.registro_id)]
    .map(id => /^MTC-(\d+)$/.exec(String(id))).filter(Boolean).map(m => Number(m[1]));
  const consecutivo = numeros.length ? Math.max(...numeros) : 0;

  const avisos = [...usr.avisos, ...registros.flatMap(r => r.avisos), ...huellas.flatMap(h => h.avisos)];
  const ids = registrosOk.map(r => r.fila.id);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  if(repetidos.length) avisos.push(`Consecutivos repetidos: ${[...new Set(repetidos)].join(", ")}.`);

  return {
    areas, tipos: convertirTipos(tiposV1), perfiles: usr.perfiles, sinCuenta: usr.sinCuenta,
    registros: registrosOk, huellas: huellas.filter(h => h.fila),
    config: appCfg ? [{ clave: "app", valor: { url: appCfg.url || "" } }] : [],
    consecutivo, avisos,
    resumen: {
      registros: registrosOk.length, omitidos: registros.length - registrosOk.length,
      bitacora: registrosOk.reduce((n, r) => n + r.bitacora.length, 0),
      firmas: registrosOk.reduce((n, r) => n + r.firmas.length, 0),
      adjuntos: registrosOk.reduce((n, r) => n + r.adjuntos.length, 0),
      eliminados: huellas.filter(h => h.fila).length, personas: usr.perfiles.length, sinCuenta: usr.sinCuenta.length,
      areas: areas.length, tipos: tiposV1.length, consecutivo,
    },
  };
}
