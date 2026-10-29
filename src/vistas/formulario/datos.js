// Lee el formulario y arma el contenido del registro (lo mismo que ya guardaba la versión 1).
import { AREA_SST, MODELO_REGISTRO } from "../../dominio/constantes.js";
import { OTRO } from "../../dominio/presentacion.js";
import { emptyD8 } from "../../dominio/d8.js";

export function datosDelFormulario(form, ctx, f){
  const fd = new FormData(form), u = ctx.yo;
  const gestion = fd.get("tipoGestion");
  const temaSel = fd.get("tema") || fd.get("area") || "";
  const temaOtro = temaSel === OTRO;
  const tema = temaOtro ? String(fd.get("temaOtro") || "").trim() : temaSel;
  const tipoSel = fd.get("tipoEspecifico") || "";
  const tipoEspecificoOtro = tipoSel === OTRO;
  const tipoEspecifico = tipoEspecificoOtro ? String(fd.get("tipoEspecificoOtro") || "").trim() : tipoSel;
  const relacionadoSST = tema === AREA_SST || fd.get("area") === AREA_SST;
  const alcance = gestion === "Derogación" ? (fd.get("alcanceDerogacion") || "Temporal") : "";
  const definitiva = alcance === "Definitiva";
  const fechaEfectiva = definitiva ? (fd.get("fechaEfectiva") || "") : "";
  const sst = (k) => relacionadoSST ? (fd.get(k) || "") : "";
  const d8 = gestion === "Derogación" ? structuredClone(f.d8) : emptyD8();
  return {
    modelo: MODELO_REGISTRO, fechaHora: fd.get("fechaHora") || "", area: fd.get("area") || "", tema, temaOtro, tipoGestion: gestion,
    tipoEspecifico, tipoEspecificoOtro, reportadoPor: fd.get("reportadoPor") || u.nombre,
    cargo: fd.get("cargo") || "", areaSolicitante: fd.get("areaSolicitante") || "", procesoSolicitante: fd.get("procesoSolicitante") || "",
    responsableProcesoId: u.id, responsableProceso: fd.get("reportadoPor") || u.nombre,
    ot: fd.get("ot") || "", proyecto: fd.get("proyecto") || "", lineaNegocio: fd.get("lineaNegocio") || "",
    relacionadoSST, peligroSST: relacionadoSST && !tipoEspecificoOtro ? tipoEspecifico : "", condicionSeguridad: sst("condicionSeguridad"),
    criticidad: fd.get("criticidad") || "", recurrente: fd.get("recurrente") === "on",
    controlesCompensatorios: fd.get("controlesCompensatorios") || "",
    alcanceDerogacion: alcance, fechaEfectiva,
    vigenciaInicio: definitiva ? fechaEfectiva : (fd.get("vigenciaInicio") || ""), vigenciaFin: definitiva ? "" : (fd.get("vigenciaFin") || ""),
    requisitoIncumplido: fd.get("requisitoIncumplido") || "", equipoInvolucrado: fd.get("equipoInvolucrado") || "",
    tareaDescripcion: fd.get("tareaDescripcion") || "", motivoDesviacion: fd.get("motivoDesviacion") || "",
    consecuenciasPotenciales: fd.get("consecuenciasPotenciales") || "",
    eppAdicional: sst("eppAdicional"), procedimientosAlternativos: sst("procedimientosAlternativos"), companeroApoyo: sst("companeroApoyo"),
    d8Started: gestion === "Derogación", d8,
  };
}
