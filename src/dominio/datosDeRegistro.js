// Separa lo que una persona puede editar de un registro de lo que calcula el sistema
// (etapa, firmas, versión, fechas...). Solo lo editable se manda a guardar.

// Estos datos los calcula el sistema o viven aparte: nunca se mandan al guardar.
const SOLO_LECTURA = ["id", "stage", "cerrado", "resultado", "borrador", "devuelta", "version", "firmas", "adjuntos",
  "bitacora", "creadoEn", "actualizadoEn", "fechaCierre", "reportadoPorId"];

export function datosDeRegistro(rec){
  const data = { ...rec };
  SOLO_LECTURA.forEach(k => delete data[k]);
  return data;
}
