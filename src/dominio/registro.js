import { FIRMA_SLOTS, STAGES } from "./constantes.js";
import { d8Faltantes, is8DComplete } from "./d8.js";

export const isClosed = (rec) => !!rec.cerrado || rec.resultado === "Rechazada";
export const isBorradorTemporal = (rec) => !!rec.borrador && String(rec.id).indexOf("BOR-") === 0;

// El dueño es quien hizo la solicitud. Esa misma persona es la que la cierra.
export const esDueno = (u, rec) =>
  (rec.reportadoPorId && u.id === rec.reportadoPorId) || (!rec.reportadoPorId && u.nombre === rec.reportadoPor);

export const slotForStage = (stage) => FIRMA_SLOTS.find(sl => sl.stage === stage);

export function pendingSlots(rec){
  if(isClosed(rec) || rec.borrador) return [];
  const sl = slotForStage(rec.stage);
  return sl && !(rec.firmas || {})[sl.key] ? [sl] : [];
}

// Dice si esta persona puede firmar este espacio.
// Más adelante la base de datos repetirá esta misma revisión, para que nadie la salte.
export function canSignSlot(u, rec, slot){
  if(u.rol !== slot.rol || slot.key === "sol") return false; // la firma de la solicitud se toma al enviarla
  if(slot.key === "admin") return true;
  if(isClosed(rec) || rec.borrador) return false;
  if(slot.stage !== rec.stage) return false;                  // solo se firma la etapa en la que va
  if(slot.key === "cierre" && !esDueno(u, rec)) return false; // cierra quien hizo la solicitud
  return true;
}

// Lo que debe estar lleno antes de firmar cada etapa. Si la lista sale vacía, ya se puede firmar.
export function requisitosFirma(rec, slot){
  const falta = [];
  const t = v => String(v || "").trim().length > 0;
  if(slot.key === "aprob"){
    if(!t(rec.conceptoEvaluacion)) falta.push("concepto de evaluación");
    if(!t(rec.controlesCompensatorios)) falta.push("medidas de control");
    if(rec.tipoGestion === "Derogación" && !is8DComplete(rec)) falta.push("reporte 8D completo (" + d8Faltantes(rec.d8).join("; ") + ")");
  }
  if(slot.key === "cierre"){
    if(!t(rec.observacionesCierre)) falta.push("observaciones de cierre");
    if(!t(rec.cumplimientoControl)) falta.push("cumplimiento de controles");
  }
  return falta;
}

// Qué registros ve cada persona. El Responsable del proceso ve los suyos y los de su área; los demás roles ven todos.
export function visibleRecords(u, records, esBorradorVisible = r => !r.borrador || (r.devuelta && !isBorradorTemporal(r))){
  let list = records.filter(esBorradorVisible);
  if(u.rol === "Responsable del proceso") list = list.filter(r => esDueno(u, r) || (!!u.area && r.area === u.area));
  return list;
}

export const esDefinitiva = (r) => r.tipoGestion === "Derogación" && r.alcanceDerogacion === "Definitiva";

export function vigenciaTexto(r){
  if(esDefinitiva(r)) return "Definitiva — efectiva de forma permanente desde " + (r.fechaEfectiva || r.vigenciaInicio || "—");
  const rango = (r.vigenciaInicio || "—") + " a " + (r.vigenciaFin || "—");
  return r.tipoGestion === "Derogación" ? "Temporal — del " + rango : rango;
}

export function validarVigencia(d){
  if(d.temaOtro && !d.tema) return "Escriba el tema de la solicitud (opción \"Otro\").";
  if(d.tipoEspecificoOtro && !d.tipoEspecifico) return "Escriba el tipo específico de desviación o derogación (opción \"Otro\").";
  if(d.tipoGestion === "Derogación"){
    if(d.alcanceDerogacion === "Definitiva"){
      if(!d.fechaEfectiva) return "Indique la fecha a partir de la cual la derogación será efectiva de forma permanente.";
    } else {
      if(!d.vigenciaInicio || !d.vigenciaFin) return "Indique el rango de fechas (desde y hasta) de la derogación temporal.";
      if(d.vigenciaFin < d.vigenciaInicio) return "La fecha final de la derogación temporal no puede ser anterior a la fecha inicial.";
    }
  } else if(d.vigenciaInicio && d.vigenciaFin && d.vigenciaFin < d.vigenciaInicio) return "La fecha final de la vigencia no puede ser anterior a la fecha inicial.";
  return "";
}

export function estadoTexto(r){
  if(r.resultado === "Rechazada") return "Rechazada";
  if(isClosed(r)) return "Cerrada";
  if(r.devuelta) return "Devuelta para ajustes";
  return STAGES[r.stage] || "";
}
