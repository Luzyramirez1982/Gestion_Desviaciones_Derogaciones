// Adaptador SUPABASE. Recibe el cliente de supabase-js ya creado (así se puede probar con uno simulado).
// Regla del proyecto: no se escribe directo en las tablas de registros; todo pasa por las funciones
// de supabase/migrations/ (crear_registro, firmar_etapa...), que revisan quién es la persona.
import { traducirErrorAuth } from "../auth/errores.js";
import { MAX_FILE_MB } from "../dominio/constantes.js";
import { nombreSeguro } from "../migracion/v1a2.js";
import { filaARegistro, filaAAdjunto, filaAPerfil, filaATipo, tipoAFila, filaAHuella, registroAData } from "./convertir.js";

const BUCKET = "archivos";
const PAGINA = 1000;           // Supabase entrega máximo 1000 filas por consulta
const VIGENCIA_URL_SEG = 3600; // los enlaces a archivos duran una hora

// Convierte un error de Supabase en un Error con mensaje claro. El conflicto de versión lleva código aparte.
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
  } else if(/jwt expired|invalid jwt/i.test(msg)){
    e.codigo = "sesion_vencida";
    e.message = "Su sesión venció. Ingrese de nuevo.";
  } else if(/duplicate key/i.test(msg)){
    e.message = "Ya existe un dato con ese nombre.";
  }
  return e;
}

export function dataUrlABlob(dataUrl){
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
  if(!m) throw new Error("La imagen de la firma no es válida. Dibújela de nuevo.");
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], {type: m[1]});
}

export function crearAdaptadorSupabase(sb, { urlBase = "" } = {}){
  let perfilActual = null;

  const ok = ({ data, error }, porDefecto) => { if(error) throw errorDe(error, porDefecto); return data; };
  const rpc = async (nombre, args = {}) => ok(await sb.rpc(nombre, args));

  async function leerTodo(armar){
    const filas = [];
    for(let desde = 0; ; desde += PAGINA){
      const lote = ok(await armar().range(desde, desde + PAGINA - 1));
      filas.push(...lote);
      if(lote.length < PAGINA) return filas;
    }
  }

  async function cargarPerfil(id){
    const fila = ok(await sb.from("perfiles").select("*").eq("id", id).maybeSingle());
    if(!fila) return null;
    return filaAPerfil(fila);
  }

  async function usuarioId(){
    const { data } = await sb.auth.getSession();
    const id = data && data.session && data.session.user && data.session.user.id;
    if(!id) throw errorDe({message: "jwt expired"});
    return id;
  }

  async function subirFirma(dataUrl){
    const blob = dataUrlABlob(dataUrl);
    const ruta = `firmas/${await usuarioId()}/${crypto.randomUUID()}.png`;
    const { error } = await sb.storage.from(BUCKET).upload(ruta, blob, {contentType: "image/png", upsert: false});
    if(error) throw errorDe(error, "No se pudo guardar la firma. Intente de nuevo.");
    return ruta;
  }

  async function detalle(id){
    const [fila, firmas, adjuntos, bitacora] = await Promise.all([
      sb.from("registros").select("*").eq("id", id).maybeSingle(),
      sb.from("firmas").select("*").eq("registro_id", id),
      sb.from("adjuntos").select("*").eq("registro_id", id).order("creado_en", {ascending: true}),
      sb.from("bitacora").select("*").eq("registro_id", id).order("id", {ascending: true}),
    ]);
    const f = ok(fila);
    if(!f) throw new Error("No se encontró el registro.");
    return filaARegistro(f, {firmas: ok(firmas), adjuntos: ok(adjuntos), bitacora: ok(bitacora)});
  }
  // Después de cada función que devuelve la fila del registro, se vuelve a leer completo.
  const recargar = (fila) => detalle(fila.id);

  return {
    nombre: "supabase",

    async iniciarSesion(correo, clave){
      const { data, error } = await sb.auth.signInWithPassword({email: String(correo).trim(), password: clave});
      if(error) throw new Error(traducirErrorAuth(error));
      const perfil = await cargarPerfil(data.user.id);
      if(!perfil || !perfil.activo){
        await sb.auth.signOut();
        throw new Error(perfil ? "Esta cuenta está desactivada. Hable con el Administrador."
          : "Su correo no está registrado como usuario de la aplicación. Solicite el acceso al Administrador.");
      }
      perfilActual = perfil;
      return perfil;
    },
    async cerrarSesion(){ perfilActual = null; await sb.auth.signOut(); },
    async sesionActual(){
      const { data } = await sb.auth.getSession();
      if(!data || !data.session) return null;
      const perfil = await cargarPerfil(data.session.user.id);
      if(!perfil || !perfil.activo) return null;
      perfilActual = perfil;
      return perfil;
    },
    async recuperarClave(correo){
      const { error } = await sb.auth.resetPasswordForEmail(String(correo).trim(), {redirectTo: urlBase || undefined});
      if(error) throw new Error(traducirErrorAuth(error));
    },
    async cambiarClave(nueva){
      const { error } = await sb.auth.updateUser({password: nueva});
      if(error) throw new Error(traducirErrorAuth(error));
      await rpc("marcar_clave_cambiada");
      const { data } = await sb.auth.getSession();
      perfilActual = data && data.session ? await cargarPerfil(data.session.user.id) : perfilActual;
      return perfilActual;
    },
    // Avisa cuando Supabase detecta que la persona llegó desde el enlace de recuperar contraseña.
    alEventoSesion(cb){
      const { data } = sb.auth.onAuthStateChange((evento) => {
        if(evento === "PASSWORD_RECOVERY") cb("recuperar");
        else if(evento === "SIGNED_OUT") cb("salio");
      });
      return () => data && data.subscription && data.subscription.unsubscribe();
    },

    async cargarBase(){
      const [perfiles, areas, tipos, conf] = await Promise.all([
        sb.from("perfiles").select("*").order("nombre"),
        sb.from("areas").select("*").order("orden").order("nombre"),
        sb.from("tipos").select("*").order("nombre"),
        sb.from("configuracion").select("*"),
      ]);
      const configuracion = {};
      ok(conf).forEach(c => { configuracion[c.clave] = c.valor; });
      return {perfiles: ok(perfiles).map(filaAPerfil), areas: ok(areas), tipos: ok(tipos).map(filaATipo), configuracion};
    },
    async listarRegistros(){
      const [filas, firmas] = await Promise.all([
        leerTodo(() => sb.from("registros").select("*").order("actualizado_en", {ascending: false})),
        leerTodo(() => sb.from("firmas").select("*").order("registro_id")),
      ]);
      const porRegistro = new Map();
      firmas.forEach(f => { if(!porRegistro.has(f.registro_id)) porRegistro.set(f.registro_id, []); porRegistro.get(f.registro_id).push(f); });
      return filas.map(f => filaARegistro(f, {firmas: porRegistro.get(f.id) || []}));
    },
    cargarRegistro: detalle,
    async listarEliminados(){
      const filas = ok(await sb.from("auditoria_eliminados").select("*").order("creado_en", {ascending: false}));
      return filas.map(filaAHuella);
    },
    async usoAlmacenamiento(){ return rpc("uso_almacenamiento"); },

    async crearRegistro({data, borrador = false, firma = ""}){
      const ruta = borrador ? "" : await subirFirma(firma);
      const fila = await rpc("crear_registro", {p_data: registroAData(data), p_borrador: borrador, p_firma_ruta: ruta});
      return recargar(fila);
    },
    async guardarRegistro(id, version, data){
      return recargar(await rpc("guardar_registro", {p_id: id, p_version: version, p_data: registroAData(data)}));
    },
    async enviarRegistro(id, version, data, firma){
      const ruta = await subirFirma(firma);
      return recargar(await rpc("enviar_registro", {p_id: id, p_version: version, p_data: registroAData(data), p_firma_ruta: ruta}));
    },
    async firmarEtapa(id, espacio, firma, comentario = ""){
      const ruta = await subirFirma(firma);
      return recargar(await rpc("firmar_etapa", {p_id: id, p_espacio: espacio, p_ruta_firma: ruta, p_comentario: comentario}));
    },
    async quitarFirmaAdmin(id){ return recargar(await rpc("quitar_firma_admin", {p_id: id})); },
    async devolverRegistro(id, motivo){ return recargar(await rpc("devolver_registro", {p_id: id, p_motivo: motivo})); },
    async rechazarRegistro(id, motivo){ return recargar(await rpc("rechazar_registro", {p_id: id, p_motivo: motivo})); },
    async retrocederEtapa(id, comentario = ""){ return recargar(await rpc("retroceder_etapa", {p_id: id, p_comentario: comentario})); },
    async convertirADerogacion(id){ return recargar(await rpc("convertir_a_derogacion", {p_id: id})); },
    async ajustarAlcance(id, alcance, inicio, fin = ""){
      return recargar(await rpc("ajustar_alcance_derogacion", {p_id: id, p_alcance: alcance, p_inicio: inicio || "", p_fin: fin || ""}));
    },

    async subirAdjunto(id, archivo){
      if(!archivo.size || archivo.size > MAX_FILE_MB * 1048576) throw new Error(`Cada archivo puede pesar hasta ${MAX_FILE_MB} MB.`);
      const ruta = `registros/${id}/${Date.now()}-${nombreSeguro(archivo.name)}`;
      const { error } = await sb.storage.from(BUCKET).upload(ruta, archivo, {contentType: archivo.type || undefined, upsert: false});
      if(error) throw errorDe(error, "No se pudo subir el archivo. Intente de nuevo.");
      const fila = await rpc("registrar_adjunto", {p_id: id, p_nombre: archivo.name, p_tipo: archivo.type || "", p_tamano: archivo.size, p_ruta: ruta});
      return filaAAdjunto(fila);
    },
    async urlArchivo(ruta){
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(ruta, VIGENCIA_URL_SEG);
      if(error) throw errorDe(error, "No se pudo abrir el archivo.");
      return data.signedUrl;
    },

    async eliminarRegistro(id, motivo){ await rpc("eliminar_registro", {p_id: id, p_motivo: motivo}); },
    async restaurarRegistro(huellaId){ return recargar(await rpc("restaurar_registro", {p_huella: huellaId})); },

    async guardarArea(nombre){
      const { data: previas } = await sb.from("areas").select("orden").order("orden", {ascending: false}).limit(1);
      const orden = previas && previas.length ? previas[0].orden + 1 : 0;
      ok(await sb.from("areas").insert({nombre: String(nombre).trim(), orden}));
    },
    async renombrarArea(viejo, nuevo){ await rpc("renombrar_area", {p_viejo: viejo, p_nuevo: nuevo}); },
    async eliminarArea(nombre){ ok(await sb.from("areas").delete().eq("nombre", nombre)); },
    async guardarTipo(tipo){ ok(await sb.from("tipos").upsert(tipoAFila(tipo))); },
    async eliminarTipo(id){ ok(await sb.from("tipos").delete().eq("id", id)); },
    async guardarConfig(clave, valor){ ok(await sb.from("configuracion").upsert({clave, valor})); },

    async actualizarPerfil(id, cambios){
      const { nombre, rol, area } = cambios;
      const fila = ok(await sb.from("perfiles").update({nombre, rol, area}).eq("id", id).select().maybeSingle());
      if(!fila) throw new Error("No se pudo guardar el cambio. Revise que la persona exista y que tenga permiso.");
      return filaAPerfil(fila);
    },

    // Crear cuentas exige la clave del servidor, así que lo hace la función admin-usuarios.
    async administrarUsuario(cuerpo){
      const { data, error } = await sb.functions.invoke("admin-usuarios", {body: cuerpo});
      if(error){
        let msg = "";
        try { msg = (await error.context.json()).error; } catch { /* sin detalle */ }
        throw new Error(msg || "No se pudo comunicar con el servidor de usuarios. Intente de nuevo.");
      }
      return data;
    },
    crearUsuario(datos){ return this.administrarUsuario({accion: "crear", ...datos}); },
    restablecerClave(id){ return this.administrarUsuario({accion: "restablecer", id}); },
    async cambiarActivo(id, activo){ await this.administrarUsuario({accion: activo ? "activar" : "desactivar", id}); },

    // Avisa cuando alguien cambia un registro, para refrescar la lista sin recargar la página.
    suscribir(alCambiar){
      const canal = sb.channel("cambios-registros")
        .on("postgres_changes", {event: "*", schema: "public", table: "registros"}, () => alCambiar())
        .subscribe();
      return () => sb.removeChannel(canal);
    },
  };
}
