// Conversión entre las filas de la base de datos y el objeto de registro que usan las pantallas.
// Las pantallas trabajan con el objeto "plano" (camelCase) de siempre; la base guarda parte en
// columnas y el resto dentro de "data".

// Datos que la base calcula o que viven en otras tablas: nunca se mandan dentro de "data".
const SOLO_LECTURA = ["id", "stage", "cerrado", "resultado", "borrador", "devuelta", "version", "firmas", "adjuntos",
  "bitacora", "creadoEn", "actualizadoEn", "fechaCierre", "reportadoPorId"];

export function filaARegistro(fila, { firmas = [], adjuntos = [], bitacora = [] } = {}){
  const rec = { ...(fila.data || {}) };
  Object.assign(rec, {
    id: fila.id, tipoGestion: fila.tipo_gestion, area: fila.area, stage: fila.etapa,
    borrador: !!fila.borrador, devuelta: !!fila.devuelta, cerrado: !!fila.cerrado, resultado: fila.resultado || "",
    reportadoPorId: fila.reportado_por_id || "", reportadoPor: fila.reportado_por || rec.reportadoPor || "",
    criticidad: fila.criticidad || "", version: fila.version,
    fechaCierre: fila.fecha_cierre || "", creadoEn: fila.creado_en || "", actualizadoEn: fila.actualizado_en || "",
  });
  if(fila.vigencia_inicio) rec.vigenciaInicio = fila.vigencia_inicio;
  if(fila.vigencia_fin) rec.vigenciaFin = fila.vigencia_fin;
  rec.firmas = {};
  firmas.forEach(f => { rec.firmas[f.espacio] = filaAFirma(f); });
  rec.adjuntos = adjuntos.map(filaAAdjunto);
  rec.bitacora = bitacora.map(b => ({ etapa: b.etapa, rol: b.rol, usuario: b.usuario, fecha: b.fecha, comentario: b.comentario }));
  return rec;
}

export const filaAFirma = (f) => ({
  nombre: f.nombre, rol: f.rol, usuarioId: f.usuario_id || "", ruta: f.ruta_imagen || "", fecha: f.fecha,
});

export const filaAAdjunto = (a) => ({
  id: a.id, nombre: a.nombre, tipo: a.tipo, tamano: Number(a.tamano) || 0, ruta: a.ruta,
  usuario: a.subido_por, fecha: a.creado_en,
});

// Lo que se manda a la base como "data": el formulario y el 8D, sin lo que la base controla.
export function registroAData(rec){
  const data = { ...rec };
  SOLO_LECTURA.forEach(k => delete data[k]);
  return data;
}

export const filaAPerfil = (p) => ({
  id: p.id, nombre: p.nombre, correo: p.correo, rol: p.rol, area: p.area || "",
  activo: p.activo !== false, debeCambiarClave: !!p.debe_cambiar_clave,
});

// Los tipos guardan en "data" el resto de sus datos (descripción, peligro GTC 45...).
export const filaATipo = (t) => ({ ...(t.data || {}), id: t.id, area: t.area, nombre: t.nombre });
export const tipoAFila = (t) => {
  const { id, area, nombre, ...resto } = t;
  return { id, area, nombre, data: resto };
};

export const filaAHuella = (h) => ({
  id: h.id, registroId: h.registro_id, eliminadoPor: h.eliminado_por, correo: h.correo, rol: h.rol, motivo: h.motivo,
  fecha: h.creado_en, restaurado: !!h.restaurado, restauradoPor: h.restaurado_por || "", restauradoEn: h.restaurado_en || "",
  copia: h.copia,
});
