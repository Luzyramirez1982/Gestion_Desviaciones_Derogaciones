// Adaptador de DEMOSTRACIÓN: guarda todo en memoria y aplica las mismas reglas básicas que la base de datos.
// Sirve para ver y probar la aplicación sin Supabase. Al recargar la página se pierde todo.
import { canSignSlot, requisitosFirma, validarVigencia, visibleRecords, isClosed, esDueno, slotForStage } from "../dominio/registro.js";
import { FIRMA_SLOTS, STAGES, MAX_FILE_MB } from "../dominio/constantes.js";
import { todayISO } from "../util/fechas.js";
import { nombreSeguro } from "../migracion/v1a2.js";
import { registroAData } from "./convertir.js";
import { PERSONAS_DEMO, CLAVE_DEMO, AREAS_DEMO, TIPOS_DEMO, registrosDemo } from "./ejemplo.js";

const copia = (x) => structuredClone(x);
const falla = (msg, codigo) => { const e = new Error(msg); if(codigo) e.codigo = codigo; return e; };
const CONSERVAR_EVAL = ["conceptoEvaluacion", "controlesCompensatorios", "observacionesAprobacion"];
const CONSERVAR_CIERRE = ["observacionesCierre", "cumplimientoControl"];

export function crearAdaptadorDemo(){
  const personas = PERSONAS_DEMO.map(p => ({...p, activo: true, debeCambiarClave: false, clave: CLAVE_DEMO}));
  let areas = copia(AREAS_DEMO);
  let tipos = copia(TIPOS_DEMO);
  const config = {};
  const registros = new Map(registrosDemo().map(r => [r.id, r]));
  let huellas = [];
  const archivos = new Map();          // ruta -> URL local del archivo
  const oyentes = new Set();
  let yo = null;                       // persona con sesión
  let consecutivo = 3, borradores = 0, huellasN = 0;

  const avisar = () => oyentes.forEach(f => f());
  const perfil = (p) => { const { clave, ...resto } = p; return copia(resto); };
  const necesitaSesion = () => { if(!yo) throw falla("Debe iniciar sesión."); return yo; };
  const soloAdmin = (msg) => { if(necesitaSesion().rol !== "Administrador") throw falla(msg); };
  const cargar = (id) => {
    const r = registros.get(id);
    if(!r || !visibleRecords(necesitaSesion(), [r], x => !x.borrador || x.reportadoPorId === yo.id || x.devuelta).length) throw falla("No se encontró el registro.");
    return r;
  };
  const anotar = (r, comentario) => r.bitacora.push({etapa: STAGES[r.stage], rol: yo.rol, usuario: yo.nombre, fecha: todayISO(), comentario});
  const tocar = (r) => { r.version += 1; r.actualizadoEn = new Date().toISOString(); avisar(); return copia(r); };
  const guardarFirma = (r, espacio, ruta) => { r.firmas[espacio] = {nombre: yo.nombre, rol: yo.rol, usuarioId: yo.id, ruta, fecha: new Date().toISOString()}; };
  const conservar = (viejo, nuevo, claves) => { claves.forEach(k => { if(k in viejo) nuevo[k] = viejo[k]; else delete nuevo[k]; }); };
  const subirFirma = (dataUrl) => {
    if(!/^data:image\//.test(dataUrl || "")) throw falla("Dibuje su firma en el recuadro antes de continuar.");
    const ruta = `firmas/${yo.id}/${Math.random().toString(36).slice(2)}.png`;
    archivos.set(ruta, dataUrl);
    return ruta;
  };
  const exigirAprobador = (r, msg) => {
    if(!["Aprobador autorizado", "Administrador"].includes(yo.rol)) throw falla(msg);
    if(r.stage !== 1 || r.borrador || isClosed(r)) throw falla("La solicitud no está en la etapa de Evaluación y Aprobación.");
  };

  return {
    nombre: "demostracion",

    async iniciarSesion(correo, clave){
      const p = personas.find(x => x.correo === String(correo).trim().toLowerCase());
      if(!p || p.clave !== clave) throw falla("Correo o contraseña incorrectos.");
      if(!p.activo) throw falla("Esta cuenta está desactivada. Hable con el Administrador.");
      yo = p;
      return perfil(p);
    },
    async cerrarSesion(){ yo = null; },
    async sesionActual(){ return yo ? perfil(yo) : null; },
    async recuperarClave(correo){
      if(!personas.some(p => p.correo === String(correo).trim().toLowerCase())) return;
    },
    async cambiarClave(nueva){ const p = necesitaSesion(); p.clave = nueva; p.debeCambiarClave = false; return perfil(p); },

    async cargarBase(){
      necesitaSesion();
      return {perfiles: personas.map(perfil), areas: copia(areas), tipos: copia(tipos), configuracion: copia(config)};
    },
    async listarRegistros(){
      const u = necesitaSesion();
      const lista = visibleRecords(u, [...registros.values()], r => !r.borrador || r.reportadoPorId === u.id || r.devuelta);
      return copia(lista).map(r => ({...r, bitacora: []}));
    },
    async cargarRegistro(id){ return copia(cargar(id)); },
    async listarEliminados(){ soloAdmin("Solo el Administrador puede ver los registros eliminados."); return copia(huellas); },
    async usoAlmacenamiento(){
      soloAdmin("Solo el Administrador puede ver el uso del espacio.");
      const bytes = [...registros.values()].reduce((s, r) => s + r.adjuntos.reduce((t, a) => t + a.tamano, 0), 0);
      return {base_datos_bytes: 12 * 1048576, base_datos_limite_bytes: 500 * 1048576,
        archivos_bytes: bytes, archivos_limite_bytes: 1024 * 1048576, registros: registros.size};
    },

    async crearRegistro({data, borrador = false, firma = ""}){
      const u = necesitaSesion();
      if(!["Responsable del proceso", "Administrador"].includes(u.rol)) throw falla("Su rol no puede crear solicitudes.");
      if(!["Desviación", "Derogación"].includes(data.tipoGestion)) throw falla("Indique si es una Desviación o una Derogación.");
      if(!data.area) throw falla("Indique el área a la que va dirigida la solicitud.");
      if(!borrador){
        if(!firma) throw falla("Dibuje su firma en el recuadro antes de enviar la solicitud.");
        const err = validarVigencia(data);
        if(err) throw falla(err);
      }
      const id = borrador ? "BOR-" + String(++borradores).padStart(4, "0") : "MTC-" + String(++consecutivo).padStart(3, "0");
      const r = {...copia(registroAData(data)), id, stage: borrador ? 0 : 1, borrador, devuelta: false, cerrado: false, resultado: "",
        reportadoPorId: u.id, reportadoPor: u.nombre, version: 1, firmas: {}, adjuntos: [], bitacora: [],
        creadoEn: new Date().toISOString(), actualizadoEn: new Date().toISOString()};
      registros.set(id, r);
      anotar(r, borrador ? "Borrador creado." : "Solicitud creada y firmada.");
      if(!borrador) guardarFirma(r, "sol", subirFirma(firma));
      avisar();
      return copia(r);
    },

    async guardarRegistro(id, version, data){
      const u = necesitaSesion(), r = cargar(id);
      if(isClosed(r)) throw falla("El registro ya está cerrado y no se puede editar.");
      if(u.rol === "Responsable del proceso" && !esDueno(u, r) && u.area !== r.area) throw falla("No puede editar este registro.");
      if(r.version !== version) throw falla("Otra persona cambió este registro mientras usted lo editaba. Vuelva a abrirlo.", "conflicto_version");
      const nuevo = copia(registroAData(data));
      if(!(["Aprobador autorizado", "Administrador"].includes(u.rol) && r.stage === 1)) conservar(r, nuevo, CONSERVAR_EVAL);
      if(!(r.stage === 2 && (u.rol === "Administrador" || r.reportadoPorId === u.id))) conservar(r, nuevo, CONSERVAR_CIERRE);
      if(!r.borrador){ nuevo.tipoGestion = r.tipoGestion; nuevo.area = r.area; }
      const { firmas, adjuntos, bitacora, id: _id, stage, borrador, devuelta, cerrado, resultado, reportadoPorId, version: _v, creadoEn, actualizadoEn } = r;
      Object.keys(r).forEach(k => delete r[k]);
      Object.assign(r, nuevo, {firmas, adjuntos, bitacora, id: _id, stage, borrador, devuelta, cerrado, resultado, reportadoPorId, version, creadoEn, actualizadoEn});
      return tocar(r);
    },

    async enviarRegistro(id, version, data, firma){
      const u = necesitaSesion(), r = cargar(id);
      if(!r.borrador) throw falla("Esta solicitud ya fue enviada.");
      if(r.reportadoPorId !== u.id) throw falla("Solo quien escribió la solicitud puede enviarla.");
      if(r.version !== version) throw falla("Otra persona cambió este registro mientras usted lo editaba. Vuelva a abrirlo.", "conflicto_version");
      if(!firma) throw falla("Dibuje su firma en el recuadro antes de enviar la solicitud.");
      const err = validarVigencia(data);
      if(err) throw falla(err);
      const nuevo = copia(registroAData(data));
      conservar(r, nuevo, CONSERVAR_EVAL); conservar(r, nuevo, CONSERVAR_CIERRE);
      const reenvio = r.devuelta;
      if(id.startsWith("BOR-")){
        registros.delete(id);
        r.id = "MTC-" + String(++consecutivo).padStart(3, "0");
        r.bitacora = r.bitacora.filter(b => b.comentario !== "Borrador creado.");
        registros.set(r.id, r);
      }
      Object.assign(r, nuevo, {stage: 1, borrador: false, devuelta: false});
      guardarFirma(r, "sol", subirFirma(firma));
      anotar(r, reenvio ? "Solicitud ajustada y reenviada con firma." : "Solicitud creada y firmada.");
      return tocar(r);
    },

    async firmarEtapa(id, espacio, firma, comentario = ""){
      const u = necesitaSesion(), r = cargar(id);
      const slot = FIRMA_SLOTS.find(s => s.key === espacio);
      if(!slot || espacio === "sol") throw falla("Ese espacio de firma no se firma aquí.");
      if(!firma) throw falla("Dibuje su firma en el recuadro antes de firmar.");
      if(!canSignSlot(u, r, slot)) throw falla("No puede firmar este espacio en este momento.");
      if(espacio !== "admin"){
        const falta = requisitosFirma(r, slot);
        if(falta.length) throw falla("Antes de firmar complete: " + falta.join("; "));
      }
      guardarFirma(r, espacio, subirFirma(firma));
      const com = comentario.trim() ? " Comentario: " + comentario.trim() : "";
      if(espacio === "admin") anotar(r, "Visto bueno del Administrador (firma)." + com);
      else if(espacio === "cierre"){ anotar(r, "Cerró la solicitud con observaciones de cierre y firma." + com); r.cerrado = true; r.fechaCierre = new Date().toISOString(); }
      else { anotar(r, "Evaluó la solicitud, la aprobó y firmó." + com); r.stage = 2; }
      return tocar(r);
    },
    async quitarFirmaAdmin(id){
      const r = cargar(id); soloAdmin("Solo el Administrador puede borrar su visto bueno.");
      delete r.firmas.admin; anotar(r, "Borró su firma (Visto bueno del Administrador (opcional)).");
      return tocar(r);
    },
    async devolverRegistro(id, motivo){
      const r = cargar(id); exigirAprobador(r, "Solo el Aprobador autorizado (o el Administrador) puede devolver la solicitud.");
      if(!String(motivo || "").trim()) throw falla("Escriba el motivo en el campo de comentario.");
      anotar(r, "Devuelta al Responsable del proceso para ajustes: " + motivo.trim());
      delete r.firmas.sol; delete r.firmas.aprob;
      Object.assign(r, {stage: 0, borrador: true, devuelta: true, motivoDevolucion: motivo.trim()});
      return tocar(r);
    },
    async rechazarRegistro(id, motivo){
      const r = cargar(id); exigirAprobador(r, "Solo el Aprobador autorizado (o el Administrador) puede rechazar la solicitud.");
      if(!String(motivo || "").trim()) throw falla("Escriba el motivo en el campo de comentario.");
      anotar(r, "Solicitud rechazada: " + motivo.trim());
      Object.assign(r, {resultado: "Rechazada", cerrado: true, fechaCierre: new Date().toISOString()});
      return tocar(r);
    },
    async retrocederEtapa(id, comentario = ""){
      const r = cargar(id); soloAdmin("Solo el Administrador puede retroceder una etapa.");
      if(r.stage !== 2 || isClosed(r)) throw falla("Solo se puede retroceder una solicitud que está en Cierre y sigue abierta.");
      anotar(r, (comentario.trim() || "Etapa retrocedida por el Administrador.") + " Se anulan las firmas desde la etapa Evaluación y Aprobación para volver a aprobarlas.");
      delete r.firmas.aprob; delete r.firmas.cierre; r.stage = 1;
      return tocar(r);
    },
    async convertirADerogacion(id){
      const r = cargar(id);
      if(!["Aprobador autorizado", "Administrador"].includes(yo.rol)) throw falla("Solo el Aprobador autorizado (o el Administrador) puede convertir una desviación en derogación.");
      if(r.tipoGestion !== "Desviación" || r.stage !== 1 || r.borrador || isClosed(r)) throw falla("Solo se puede convertir una desviación abierta que esté en Evaluación y Aprobación.");
      anotar(r, "Convertida de desviación a derogación por recurrencia. Se activa el análisis 8D.");
      Object.assign(r, {tipoGestion: "Derogación", d8Started: true, alcanceDerogacion: "Temporal"});
      return tocar(r);
    },
    async ajustarAlcance(id, alcance, inicio, fin = ""){
      const r = cargar(id), def = alcance === "Definitiva";
      if(!["Temporal", "Definitiva"].includes(alcance)) throw falla("El alcance debe ser Temporal o Definitiva.");
      if(!(["Aprobador autorizado", "Administrador"].includes(yo.rol) || r.reportadoPorId === yo.id)) throw falla("No puede ajustar el alcance de esta derogación.");
      if(r.tipoGestion !== "Derogación" || r.stage !== 1 || r.borrador || isClosed(r)) throw falla("El alcance solo se ajusta en una derogación abierta, durante la Evaluación y Aprobación.");
      const nuevo = {tipoGestion: "Derogación", alcanceDerogacion: alcance, fechaEfectiva: def ? inicio || "" : "", vigenciaInicio: inicio || "", vigenciaFin: def ? "" : fin || ""};
      const err = validarVigencia(nuevo);
      if(err) throw falla(err);
      anotar(r, `Alcance de la derogación ajustado a ${alcance}.`);
      const { tipoGestion, ...resto } = nuevo;
      Object.assign(r, resto);
      return tocar(r);
    },

    async subirAdjunto(id, archivo){
      const u = necesitaSesion(), r = cargar(id);
      if(isClosed(r)) throw falla("El registro está cerrado y no admite más archivos.");
      if(!archivo.size || archivo.size > MAX_FILE_MB * 1048576) throw falla(`Cada archivo puede pesar hasta ${MAX_FILE_MB} MB.`);
      if(r.adjuntos.length >= 50) throw falla("Este registro ya tiene el máximo de 50 archivos.");
      const ruta = `registros/${id}/${Date.now()}-${nombreSeguro(archivo.name)}`;
      archivos.set(ruta, typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(archivo) : "");
      const adj = {id: ruta, nombre: archivo.name, tipo: archivo.type || "", tamano: archivo.size, ruta, usuario: u.nombre, fecha: new Date().toISOString()};
      r.adjuntos.push(adj);
      avisar();
      return copia(adj);
    },
    async urlArchivo(ruta){ return archivos.get(ruta) || ""; },

    async eliminarRegistro(id, motivo){
      soloAdmin("Solo el Administrador puede eliminar registros.");
      if(String(motivo || "").trim().length < 5) throw falla("Escriba el motivo de la eliminación.");
      const r = registros.get(id);
      if(!r) throw falla("No se encontró el registro.");
      huellas.unshift({id: "h-" + (++huellasN), registroId: id, eliminadoPor: yo.nombre, correo: yo.correo, rol: yo.rol, motivo: motivo.trim(),
        fecha: new Date().toISOString(), restaurado: false, restauradoPor: "", restauradoEn: "", copia: copia(r)});
      registros.delete(id);
      avisar();
    },
    async restaurarRegistro(huellaId){
      soloAdmin("Solo el Administrador puede restaurar registros.");
      const h = huellas.find(x => x.id === huellaId);
      if(!h) throw falla("No se encontró esa huella.");
      if(h.restaurado) throw falla("Este registro ya fue restaurado.");
      if(registros.has(h.registroId)) throw falla(`Ya existe un registro con el consecutivo ${h.registroId}.`);
      registros.set(h.registroId, copia(h.copia));
      Object.assign(h, {restaurado: true, restauradoPor: yo.nombre, restauradoEn: new Date().toISOString()});
      avisar();
      return copia(h.copia);
    },

    async guardarArea(nombre){
      soloAdmin("Solo el Administrador puede cambiar las áreas.");
      const n = String(nombre).trim();
      if(!n) throw falla("El nombre del área no puede quedar vacío.");
      if(areas.some(a => a.nombre === n)) throw falla("Ya existe un área con ese nombre.");
      areas.push({nombre: n, orden: areas.length});
    },
    async renombrarArea(viejo, nuevo){
      soloAdmin("Solo el Administrador puede cambiar las áreas.");
      const n = String(nuevo).trim();
      if(!n) throw falla("El nombre del área no puede quedar vacío.");
      if(areas.some(a => a.nombre === n)) throw falla("Ya existe un área con ese nombre.");
      const a = areas.find(x => x.nombre === viejo);
      if(!a) throw falla("No existe esa área.");
      a.nombre = n;
      tipos.forEach(t => { if(t.area === viejo) t.area = n; });
      personas.forEach(p => { if(p.area === viejo) p.area = n; });
      registros.forEach(r => { if(r.area === viejo) r.area = n; });
      avisar();
    },
    async eliminarArea(nombre){
      soloAdmin("Solo el Administrador puede cambiar las áreas.");
      if([...registros.values()].some(r => r.area === nombre) || personas.some(p => p.area === nombre))
        throw falla("No se puede eliminar un área con registros o usuarios asignados.");
      areas = areas.filter(a => a.nombre !== nombre);
      tipos = tipos.filter(t => t.area !== nombre);
    },
    async guardarTipo(tipo){
      soloAdmin("Solo el Administrador puede cambiar los tipos.");
      const i = tipos.findIndex(t => t.id === tipo.id);
      if(i >= 0) tipos[i] = copia(tipo); else tipos.push(copia(tipo));
    },
    async eliminarTipo(id){ soloAdmin("Solo el Administrador puede cambiar los tipos."); tipos = tipos.filter(t => t.id !== id); },
    async guardarConfig(clave, valor){ soloAdmin("Solo el Administrador puede cambiar los ajustes."); config[clave] = copia(valor); },

    async actualizarPerfil(id, cambios){
      soloAdmin("Solo el Administrador puede cambiar a las personas.");
      const p = personas.find(x => x.id === id);
      if(!p) throw falla("No se encontró a esa persona.");
      if(p.rol === "Administrador" && cambios.rol && cambios.rol !== "Administrador" && !personas.some(x => x.id !== id && x.rol === "Administrador" && x.activo))
        throw falla("Debe quedar al menos un Administrador activo.");
      Object.assign(p, cambios);
      return perfil(p);
    },
    async crearUsuario({nombre, correo, rol, area}){
      soloAdmin("Solo un Administrador puede hacer esto.");
      const c = String(correo).trim().toLowerCase();
      if(personas.some(p => p.correo === c)) throw falla("Ya existe una cuenta con ese correo.");
      const clave = "Temp" + Math.random().toString(36).slice(2, 8) + "7";
      const p = {id: "u-" + Math.random().toString(36).slice(2, 8), nombre, correo: c, rol, area: area || "", activo: true, debeCambiarClave: true, clave};
      personas.push(p);
      return {id: p.id, correo: c, clave};
    },
    async restablecerClave(id){
      soloAdmin("Solo un Administrador puede hacer esto.");
      const p = personas.find(x => x.id === id);
      if(!p) throw falla("No se encontró a esa persona.");
      p.clave = "Temp" + Math.random().toString(36).slice(2, 8) + "7"; p.debeCambiarClave = true;
      return {id, clave: p.clave};
    },
    async cambiarActivo(id, activo){
      soloAdmin("Solo un Administrador puede hacer esto.");
      const p = personas.find(x => x.id === id);
      if(!p) throw falla("No se encontró a esa persona.");
      if(!activo && id === yo.id) throw falla("No puede desactivar su propia cuenta.");
      if(!activo && p.rol === "Administrador" && !personas.some(x => x.id !== id && x.rol === "Administrador" && x.activo))
        throw falla("Debe quedar al menos un Administrador activo.");
      p.activo = activo;
    },

    suscribir(alCambiar){ oyentes.add(alCambiar); return () => oyentes.delete(alCambiar); },
  };
}
