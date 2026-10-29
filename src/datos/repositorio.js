// Punto único para hablar con los datos. Las pantallas solo usan lo que devuelve crearRepositorio().
//
// Interfaz (todas las funciones son async; los errores traen un mensaje claro para la clienta,
// y el conflicto de versión trae error.codigo === "conflicto_version"):
//   sesión:      iniciarSesion(correo, clave), cerrarSesion(), sesionActual(), recuperarClave(correo),
//                cambiarClave(nueva), alEventoSesion(cb)
//   lectura:     cargarBase(), listarRegistros(), cargarRegistro(id), listarEliminados(), usoAlmacenamiento()
//   registros:   crearRegistro({data, borrador, firma}), guardarRegistro(id, version, data),
//                enviarRegistro(id, version, data, firma), firmarEtapa(id, espacio, firma, comentario),
//                quitarFirmaAdmin(id), devolverRegistro(id, motivo), rechazarRegistro(id, motivo),
//                retrocederEtapa(id, comentario), convertirADerogacion(id), ajustarAlcance(id, alcance, inicio, fin)
//   archivos:    subirAdjunto(id, archivo), urlArchivo(ruta)
//   eliminados:  eliminarRegistro(id, motivo), restaurarRegistro(huellaId)
//   catálogos:   guardarArea(nombre), renombrarArea(viejo, nuevo), eliminarArea(nombre), guardarTipo(tipo),
//                eliminarTipo(id), guardarConfig(clave, valor)
//   personas:    actualizarPerfil(id, {nombre, rol, area}), crearUsuario({nombre, correo, rol, area}),
//                restablecerClave(id), cambiarActivo(id, activo)
//   en vivo:     suscribir(alCambiar) -> función para cancelar
import { createClient } from "@supabase/supabase-js";
import { crearAdaptadorDemo } from "./demo.js";
import { crearAdaptadorSupabase } from "./supabase.js";

// Si faltan la URL o la clave pública, la app arranca en modo demostración (nunca contra producción).
export function configuracionDe(env = {}){
  const url = String(env.VITE_SUPABASE_URL || "").trim();
  const clave = String(env.VITE_SUPABASE_KEY || "").trim();
  return url && clave ? { url, clave } : null;
}

export function crearRepositorio(env = {}, ubicacion = ""){
  const cfg = configuracionDe(env);
  if(!cfg) return { ...crearAdaptadorDemo(), demo: true, alEventoSesion: () => () => {} };
  const sb = createClient(cfg.url, cfg.clave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return { ...crearAdaptadorSupabase(sb, { urlBase: ubicacion }), demo: false };
}
