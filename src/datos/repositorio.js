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
//   en vivo:     suscribir(alCambiar) -> función para cancelar (opcional)
import { crearAdaptadorDemo } from "./demo.js";
import { crearAdaptadorNeon } from "./neon.js";

// Si existe VITE_NEON_URL (ver .env.example) la aplicación usa la base de datos real en Neon.
// Sin ella funciona en modo demostración, con datos de ejemplo en memoria.
// El SDK de Neon se carga solo cuando hay base real: así el modo demostración y las pruebas no lo necesitan.
export async function crearRepositorio(urlNeon = import.meta.env && import.meta.env.VITE_NEON_URL){
  if(urlNeon){
    const { createClient } = await import("@neondatabase/neon-js");
    const cliente = createClient(urlNeon);
    return { ...crearAdaptadorNeon(cliente), demo: false };
  }
  return { ...crearAdaptadorDemo(), demo: true, alEventoSesion: () => () => {} };
}