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
import { crearAdaptadorDemo } from "./demo.js";

// Todavía no hay una base de datos real conectada (ver PLAN.md): la aplicación funciona en modo demostración,
// con datos de ejemplo en memoria. Cuando se elija la base de datos, aquí se agrega su adaptador.
export function crearRepositorio(){
  return { ...crearAdaptadorDemo(), demo: true, alEventoSesion: () => () => {} };
}
