// Excel histórico: hojas Registros, Bitácora, Acciones 8D y (solo Administrador) Eliminados.
// Aquí solo se arman las filas; descargar el archivo lo hace app/exportar.js.
import { STAGES } from "../dominio/constantes.js";
import { esDefinitiva, estadoTexto } from "../dominio/registro.js";
import { is8DComplete } from "../dominio/d8.js";

const texto = (v) => (v === undefined || v === null ? "" : String(v));

export function filasRegistros(regs){
  return regs.map(r => {
    const f = (k) => (r.firmas && r.firmas[k]) || null;
    const definitiva = esDefinitiva(r);
    return {
      "Consecutivo": r.id, "Estado": estadoTexto(r), "Etapa": STAGES[r.stage] || "",
      "Fecha y hora de solicitud": texto(r.fechaHora).replace("T", " "),
      "Responsable del proceso (solicitante)": r.reportadoPor, "Cargo": r.cargo, "Área (organigrama)": r.areaSolicitante, "Proceso": r.procesoSolicitante,
      "Dirigida al área de": r.area, "Relacionada con temas de": r.tema || r.area, "Tipo específico de desviación o derogación": r.tipoEspecifico,
      "Clasificación GTC 45": r.condicionSeguridad, "OT": r.ot, "Proyecto": r.proyecto, "Línea de negocio": r.lineaNegocio,
      "Figura": r.tipoGestion, "Criticidad": r.criticidad, "Recurrente": r.recurrente ? "Sí" : "No",
      "Alcance de la derogación": r.alcanceDerogacion || (r.tipoGestion === "Derogación" ? "Temporal" : "No aplica"),
      "Vigencia inicio": definitiva ? "" : r.vigenciaInicio, "Vigencia fin": definitiva ? "" : r.vigenciaFin, "Fecha efectiva (definitiva)": definitiva ? r.fechaEfectiva : "",
      "Requisito incumplido": r.requisitoIncumplido, "Motivo": r.motivoDesviacion, "Consecuencias potenciales": r.consecuenciasPotenciales,
      "Medidas de control": r.controlesCompensatorios, "Concepto de evaluación": r.conceptoEvaluacion, "Observaciones de aprobación": r.observacionesAprobacion,
      "Aprobado por": f("aprob") ? f("aprob").nombre : "", "Fecha de aprobación": f("aprob") ? texto(f("aprob").fecha).slice(0, 10) : "",
      "Observaciones de cierre": r.observacionesCierre, "Cumplimiento de controles": r.cumplimientoControl,
      "Cerrado por": f("cierre") ? f("cierre").nombre : "", "Fecha de cierre": texto(r.fechaCierre).slice(0, 10),
      "8D completo": r.tipoGestion === "Derogación" ? (is8DComplete(r) ? "Sí" : "No") : "No aplica",
      "Archivos adjuntos": (r.adjuntos || []).length,
    };
  });
}

export const filasBitacora = (regs) => regs.flatMap(r => (r.bitacora || []).map(b =>
  ({"Consecutivo": r.id, "Fecha": b.fecha, "Etapa": b.etapa, "Rol": b.rol, "Usuario": b.usuario, "Comentario": b.comentario})));

export function filasAcciones8D(regs){
  const filas = [];
  regs.filter(r => r.tipoGestion === "Derogación").forEach(r => {
    const d8 = r.d8 || {};
    (d8.contencion || []).filter(a => a.accion || a.puntoControl).forEach(a => filas.push({"Consecutivo": r.id, "Tipo": "Contención (D3)", "Causa": "", "Acción": a.accion, "Punto de control": a.puntoControl, "Fecha de realización": a.fecha, "Responsable": a.responsable}));
    (d8.correctivas || []).filter(a => a.causa || a.accion).forEach(a => filas.push({"Consecutivo": r.id, "Tipo": "Correctiva (D5)", "Causa": a.causa, "Acción": a.accion, "Punto de control": "", "Fecha de realización": a.fecha, "Responsable": a.responsable}));
  });
  return filas;
}

export const filasEliminados = (huellas) => huellas.map(h => {
  const r = (h.copia && h.copia.registro) || h.copia || {};
  const d = r.data || r;
  return {"Fecha": texto(h.fecha).slice(0, 10), "Consecutivo": h.registroId, "Figura": r.tipo_gestion || r.tipoGestion, "Tipo específico": d.tipoEspecifico, "Área": r.area,
    "Eliminado por": h.eliminadoPor, "Rol": h.rol, "Correo": h.correo, "Motivo": h.motivo,
    "Restaurado": h.restaurado ? `Sí (${h.restauradoPor}, ${texto(h.restauradoEn).slice(0, 10)})` : "No"};
});

// Convierte una lista de objetos en filas de hoja: encabezado en negrita y todo como texto.
// Las celdas van como texto (type: String), así que un valor que empiece con "=" nunca se ejecuta como fórmula.
export function hojaDe(nombre, objetos){
  const filas = objetos.length ? objetos : [{"Sin datos": ""}];
  const cols = Object.keys(filas[0]);
  const encabezado = cols.map(c => ({value: c, fontWeight: "bold", backgroundColor: "#E2E8F0"}));
  const cuerpo = filas.map(o => cols.map(c => ({value: texto(o[c]), type: String})));
  const ancho = cols.map(c => Math.min(60, Math.max(c.length + 2, ...filas.slice(0, 200).map(o => texto(o[c]).length))));
  return {sheet: nombre, data: [encabezado, ...cuerpo], columns: ancho.map(width => ({width}))};
}

export function hojasHistorico({registros, eliminados = [], esAdmin = false}){
  const regs = registros.filter(r => !r.borrador || r.devuelta).slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const hojas = [hojaDe("Registros", filasRegistros(regs)), hojaDe("Bitácora", filasBitacora(regs)), hojaDe("Acciones 8D", filasAcciones8D(regs))];
  if(esAdmin) hojas.push(hojaDe("Eliminados", filasEliminados(eliminados)));
  return hojas;
}
