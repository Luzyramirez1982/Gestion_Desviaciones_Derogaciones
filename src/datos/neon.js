// Adaptador NEON. Recibe el cliente de @neondatabase/neon-js ya creado (así se puede probar con uno simulado).
// Regla del proyecto: no se escribe directo en las tablas de registros; todo pasa por las funciones
// de db/migraciones/ (crear_registro, firmar_etapa...), que revisan quién es la persona.
// El ingreso lo hace Neon (Managed Better Auth); aquí solo se llama a su cliente.
import { traducirErrorAuth } from "../auth/errores.js";
import { MAX_FILE_MB } from "../dominio/constantes.js";
import { nombreSeguro } from "../util/nombreArchivo.js";
import { filaARegistro, filaAAdjunto, filaAPerfil, filaATipo, tipoAFila, filaAHuella, registroAData } from "./convertir.js";

const PAGINA = 1000;   // la API entrega como máximo 1000 filas por consulta
// Cuando Neon (plan gratis) se duerme por falta de uso, las primeras consultas al despertar a veces no reconocen la
// sesión: una lista llega vacía o la base niega un permiso que sí se tiene. Por eso se reintenta antes de dar la respuesta.
const ESPERA_REINTENTO_MS = 400;
const REINTENTOS = 2;
// Mensajes de la base que significan «no tiene permiso» (a veces falsos justo al despertar).
const ES_NEGACION_DE_PERMISO = /^(Solo el |No tiene permiso|No puede )|permission denied|row-level security/i;
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

// Convierte un error de la API en un Error con mensaje claro. El conflicto de versión lleva código aparte.
export function errorDe(error, porDefecto = "No se pudo completar la operación. Intente de nuevo."){
  const msg = String((error && error.message) || "");
  const e = new Error(msg || porDefecto);
  if(/conflicto_version/.test(msg)){
    e.codigo = "conflicto_version";
    e.message = (error.hint) || "Otra persona cambió este registro mientras usted lo editaba. Vuelva a abrirlo.";
  } else if(/permission denied|row-level security|violates row-level/i.test(msg)){
    e.message = "No tiene permiso para hacer esto.";
  } else if(/failed to fetch|networkerror|load failed/i.test(msg)){
    e.codigo = "sin_conexion";
    e.message = "No hay conexión con el servidor. Revise su internet y vuelva a intentarlo.";
  } else if(/jwt expired|invalid jwt|jwt.*(invalid|expired)|not authenticated|authrequired|authentication required/i.test(msg)){
    e.codigo = "sesion_vencida";
    e.message = "Su sesión venció. Ingrese de nuevo.";
  } else if(/duplicate key/i.test(msg)){
    e.message = "Ya existe un dato con ese nombre.";
  }
  return e;
}

// "data:image/png;base64,AAAA" -> Blob de la imagen (así se sube la firma dibujada en pantalla)
export function dataUrlABlob(dataUrl){
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
  if(!m) throw new Error("La imagen de la firma no es válida. Dibújela de nuevo.");
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] });
}

// Contraseña temporal: letras y números al azar (cumple la regla de la aplicación).
export function claveTemporal(){
  const alfabeto = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const azar = crypto.getRandomValues(new Uint8Array(10));
  return "T" + Array.from(azar, b => alfabeto[b % alfabeto.length]).join("") + "7";
}

// `almacen` es quien sube y baja los archivos: { subir(ruta, tipo, blob), bajar(ruta) -> Blob } (ver almacen.js).
// `esperaMs` es la pausa entre reintentos (las pruebas la ponen en 0).
export function crearAdaptadorNeon(cliente, almacen, { esperaMs = ESPERA_REINTENTO_MS } = {}){
  let perfilActual = null;
  let claveEnUso = "";   // la contraseña con la que se ingresó en esta sesión; Neon la pide para cambiarla

  const auth = cliente.auth;
  const ok = ({ data, error }, porDefecto) => { if(error) throw errorDe(error, porDefecto); return data; };
  // Llama a una función de la base. Si responde «no tiene permiso», vuelve a preguntar un par de veces antes de darlo
  // por cierto (ver arriba); un permiso realmente negado cuesta unos instantes más y nada se ejecutó.
  const rpc = async (nombre, args = {}) => {
    for(let intento = 0; ; intento++){
      const { data, error } = await cliente.rpc(nombre, args);
      if(!error) return data;
      if(!ES_NEGACION_DE_PERMISO.test(String(error.message || "")) || intento === REINTENTOS) throw errorDe(error);
      await esperar(esperaMs);
    }
  };

  // En las primeras consultas tras un rato sin uso, Neon a veces responde "bien" pero con la lista vacía.
  // Si llega vacía se vuelve a pedir un par de veces antes de darla por buena; una lista realmente vacía
  // solo cuesta un instante más.
  async function leerSeguro(armar){
    for(let intento = 0; ; intento++){
      const datos = ok(await armar());
      const vacio = Array.isArray(datos) ? datos.length === 0 : datos == null;
      if(!vacio || intento === REINTENTOS) return datos;
      await esperar(esperaMs);
    }
  }

  // Lee la lista de solicitudes por páginas (cada solicitud trae sus firmas, todo en la misma consulta).
  async function listarPaginas(){
    const filas = [];
    for(let desde = 0; ; desde += PAGINA){
      const pedir = () => cliente.rpc("listar_registros", { p_desde: desde, p_cantidad: PAGINA });
      const lote = desde === 0 ? await leerSeguro(pedir) : ok(await pedir());
      filas.push(...lote);
      if(lote.length < PAGINA) return filas;
    }
  }

  async function cargarPerfil(id){
    const fila = ok(await cliente.from("perfiles").select("*").eq("id", id).maybeSingle());
    return fila ? filaAPerfil(fila) : null;
  }

  async function usuarioActual(){
    const { data } = await auth.getSession();
    const user = data && (data.user || (data.session && data.session.user));
    return user && user.id ? user : null;
  }
  async function usuarioId(){
    const user = await usuarioActual();
    if(!user) throw errorDe({ message: "not authenticated" });
    return user.id;
  }

  // Los archivos y las firmas van al bucket por la función de servidor «archivos», que le pregunta a la base
  // si la persona tiene permiso (ver functions/archivos/).
  async function subirFirma(dataUrl){
    const blob = dataUrlABlob(dataUrl);
    const ruta = `firmas/${await usuarioId()}/${crypto.randomUUID()}.png`;
    await almacen.subir(ruta, blob.type, blob);
    return ruta;
  }

  async function detalle(id){
    // Todo en una sola consulta: la solicitud llega completa (con firmas, adjuntos y bitácora) o no llega.
    const completo = await leerSeguro(() => cliente.rpc("registro_completo", { p_id: id }));
    if(!completo) throw new Error("No se encontró el registro.");
    return filaARegistro(completo.registro, { firmas: completo.firmas, adjuntos: completo.adjuntos, bitacora: completo.bitacora });
  }
  // Después de cada función que devuelve la fila del registro, se vuelve a leer completo.
  const recargar = (fila) => detalle(fila.id);

  // Las acciones de administración de cuentas de ingreso (crear, cambiar contraseña, bloquear) las hace Neon.
  async function conAdmin(accion, fallo){
    const { data, error } = await accion();
    if(error) throw new Error(traducirErrorAuth(error) || fallo);
    return data;
  }

  return {
    nombre: "neon",

    async iniciarSesion(correo, clave){
      const { data, error } = await auth.signIn.email({ email: String(correo).trim(), password: clave });
      if(error) throw new Error(traducirErrorAuth(error));
      const user = (data && data.user) || await usuarioActual();
      const perfil = user ? await cargarPerfil(user.id) : null;
      if(!perfil || !perfil.activo){
        await auth.signOut();
        throw new Error(perfil ? "Esta cuenta está desactivada. Hable con el Administrador."
          : "Su correo no está registrado como usuario de la aplicación. Solicite el acceso al Administrador.");
      }
      claveEnUso = clave;
      perfilActual = perfil;
      return perfil;
    },
    async cerrarSesion(){ perfilActual = null; claveEnUso = ""; await auth.signOut(); },
    async sesionActual(){
      const user = await usuarioActual();
      if(!user) return null;
      const perfil = await cargarPerfil(user.id);
      if(!perfil || !perfil.activo) return null;
      perfilActual = perfil;
      return perfil;
    },
    // El enlace de recuperación por correo de Neon necesita una pantalla de «nueva contraseña» que todavía no existe
    // y un correo de envío propio (el compartido tiene límite). Mientras tanto, el Administrador restablece la contraseña.
    async recuperarClave(){
      throw new Error("Pida al Administrador que restablezca su contraseña: le dará una temporal para entrar y cambiarla.");
    },    async cambiarClave(nueva){
      // Neon pide la contraseña actual. Si se recargó la página no la tenemos: se pide volver a ingresar.
      if(!claveEnUso){
        await auth.signOut();
        throw new Error("Por seguridad, ingrese de nuevo con su contraseña temporal para poder cambiarla.");
      }
      const { error } = await auth.changePassword({ newPassword: nueva, currentPassword: claveEnUso, revokeOtherSessions: true });
      if(error) throw new Error(traducirErrorAuth(error));
      claveEnUso = nueva;
      await rpc("marcar_clave_cambiada");
      const user = await usuarioActual();
      perfilActual = user ? await cargarPerfil(user.id) : perfilActual;
      return perfilActual;
    },
    // Neon no avisa por eventos cuando llega el enlace de recuperar contraseña: la pantalla de ingreso lo maneja.
    alEventoSesion(){ return () => {}; },

    async cargarBase(){
      const [perfiles, areas, tipos, conf] = await Promise.all([
        leerSeguro(() => cliente.from("perfiles").select("*").order("nombre")),
        leerSeguro(() => cliente.from("areas").select("*").order("orden").order("nombre")),
        leerSeguro(() => cliente.from("tipos").select("*").order("nombre")),
        cliente.from("configuracion").select("*"),
      ]);
      const configuracion = {};
      ok(conf).forEach(c => { configuracion[c.clave] = c.valor; });
      return { perfiles: perfiles.map(filaAPerfil), areas, tipos: tipos.map(filaATipo), configuracion };
    },
    async listarRegistros(){
      return (await listarPaginas()).map(({ registro, firmas }) => filaARegistro(registro, { firmas }));
    },
    cargarRegistro: detalle,
    async listarEliminados(){
      const filas = ok(await cliente.from("auditoria_eliminados").select("*").order("creado_en", { ascending: false }));
      return filas.map(filaAHuella);
    },
    async usoAlmacenamiento(){ return rpc("uso_almacenamiento"); },

    async crearRegistro({ data, borrador = false, firma = "" }){
      const ruta = borrador ? "" : await subirFirma(firma);
      const fila = await rpc("crear_registro", { p_data: registroAData(data), p_borrador: borrador, p_firma_ruta: ruta });
      return recargar(fila);
    },
    async guardarRegistro(id, version, data){
      return recargar(await rpc("guardar_registro", { p_id: id, p_version: version, p_data: registroAData(data) }));
    },
    async enviarRegistro(id, version, data, firma){
      const ruta = await subirFirma(firma);
      return recargar(await rpc("enviar_registro", { p_id: id, p_version: version, p_data: registroAData(data), p_firma_ruta: ruta }));
    },
    async firmarEtapa(id, espacio, firma, comentario = ""){
      const ruta = await subirFirma(firma);
      return recargar(await rpc("firmar_etapa", { p_id: id, p_espacio: espacio, p_ruta_firma: ruta, p_comentario: comentario }));
    },
    async quitarFirmaAdmin(id){ return recargar(await rpc("quitar_firma_admin", { p_id: id })); },
    async devolverRegistro(id, motivo){ return recargar(await rpc("devolver_registro", { p_id: id, p_motivo: motivo })); },
    async rechazarRegistro(id, motivo){ return recargar(await rpc("rechazar_registro", { p_id: id, p_motivo: motivo })); },
    async retrocederEtapa(id, comentario = ""){ return recargar(await rpc("retroceder_etapa", { p_id: id, p_comentario: comentario })); },
    async convertirADerogacion(id){ return recargar(await rpc("convertir_a_derogacion", { p_id: id })); },
    async ajustarAlcance(id, alcance, inicio, fin = ""){
      return recargar(await rpc("ajustar_alcance_derogacion", { p_id: id, p_alcance: alcance, p_inicio: inicio || "", p_fin: fin || "" }));
    },

    async subirAdjunto(id, archivo){
      if(!archivo.size || archivo.size > MAX_FILE_MB * 1048576) throw new Error(`Cada archivo puede pesar hasta ${MAX_FILE_MB} MB.`);
      const ruta = `registros/${id}/${Date.now()}-${nombreSeguro(archivo.name)}`;
      await almacen.subir(ruta, archivo.type || "application/octet-stream", archivo);
      const fila = await rpc("registrar_adjunto", { p_id: id, p_nombre: archivo.name, p_tipo: archivo.type || "", p_tamano: archivo.size, p_ruta: ruta });
      return filaAAdjunto(fila);
    },
    // Devuelve un enlace temporal que solo existe en el navegador de quien lo pide (nada se publica).
    async urlArchivo(ruta){
      return URL.createObjectURL(await almacen.bajar(ruta));
    },

    async eliminarRegistro(id, motivo){ await rpc("eliminar_registro", { p_id: id, p_motivo: motivo }); },
    async restaurarRegistro(huellaId){ return recargar(await rpc("restaurar_registro", { p_huella: huellaId })); },

    async guardarArea(nombre){
      const { data: previas } = await cliente.from("areas").select("orden").order("orden", { ascending: false }).limit(1);
      const orden = previas && previas.length ? previas[0].orden + 1 : 0;
      ok(await cliente.from("areas").insert({ nombre: String(nombre).trim(), orden }));
    },
    async renombrarArea(viejo, nuevo){ await rpc("renombrar_area", { p_viejo: viejo, p_nuevo: nuevo }); },
    async eliminarArea(nombre){ ok(await cliente.from("areas").delete().eq("nombre", nombre)); },
    async guardarTipo(tipo){ ok(await cliente.from("tipos").upsert(tipoAFila(tipo))); },
    async eliminarTipo(id){ ok(await cliente.from("tipos").delete().eq("id", id)); },
    async guardarConfig(clave, valor){ ok(await cliente.from("configuracion").upsert({ clave, valor })); },

    async actualizarPerfil(id, cambios){
      const { nombre, rol, area } = cambios;
      const fila = ok(await cliente.from("perfiles").update({ nombre, rol, area }).eq("id", id).select().maybeSingle());
      if(!fila) throw new Error("No se pudo guardar el cambio. Revise que la persona exista y que tenga permiso.");
      return filaAPerfil(fila);
    },

    // Crear la cuenta de ingreso (la hace Neon) y anotar a la persona en la aplicación (lo hace la base de datos).
    async crearUsuario({ nombre, correo, rol, area }){
      const clave = claveTemporal();
      const email = String(correo).trim().toLowerCase();
      const creada = await conAdmin(() => auth.admin.createUser({ email, password: clave, name: nombre, role: "user" }),
        "No se pudo crear la cuenta de ingreso.");
      const id = creada && (creada.user ? creada.user.id : creada.id);
      if(!id) throw new Error("No se pudo crear la cuenta de ingreso.");
      try {
        await rpc("crear_perfil", { p_id: id, p_nombre: nombre, p_correo: email, p_rol: rol, p_area: area || "" });
      } catch(e){
        // Si no se pudo anotar, se quita la cuenta de ingreso para no dejar cuentas sueltas.
        await auth.admin.removeUser({ userId: id }).catch(() => {});
        throw e;
      }
      return { id, correo: email, clave };
    },
    async restablecerClave(id){
      const clave = claveTemporal();
      await conAdmin(() => auth.admin.setUserPassword({ userId: id, newPassword: clave }), "No se pudo restablecer la contraseña.");
      ok(await cliente.from("perfiles").update({ debe_cambiar_clave: true }).eq("id", id));
      return { id, clave };
    },
    async cambiarActivo(id, activo){
      // Primero la base (que protege al último Administrador); después se bloquea o libera el ingreso.
      const fila = ok(await cliente.from("perfiles").update({ activo }).eq("id", id).select().maybeSingle());
      if(!fila) throw new Error("No se pudo guardar el cambio. Revise que la persona exista y que tenga permiso.");
      // El bloqueo en Neon es un refuerzo: aunque falle, la base ya no deja pasar a una persona desactivada.
      try { await (activo ? auth.admin.unbanUser({ userId: id }) : auth.admin.banUser({ userId: id })); } catch { /* sin refuerzo */ }
    },

    // Por ahora no hay aviso en vivo: la lista se refresca al volver a la pestaña (ver src/nucleo/envivo.js).
    // Así Neon se puede dormir cuando nadie usa la aplicación y se cuidan las horas gratuitas.
  };
}
