// Vuelve a poner en el formulario lo que se guardó en el borrador (o en la solicitud devuelta).
import { OTRO } from "../../dominio/presentacion.js";

export function rellenar(form, d, ctx){
  const poner = (nombre, valor) => { const c = form.querySelector(`[name="${nombre}"]`); if(c && valor !== undefined && valor !== null) c.value = valor; };
  const avisar = (id) => form.querySelector("#" + id).dispatchEvent(new Event("change", {bubbles: true}));
  const areas = ctx.nombresAreas();
  ["fechaHora", "reportadoPor", "cargo", "areaSolicitante", "procesoSolicitante", "ot", "proyecto", "lineaNegocio", "requisitoIncumplido",
   "equipoInvolucrado", "tareaDescripcion", "motivoDesviacion", "consecuenciasPotenciales", "controlesCompensatorios", "vigenciaInicio",
   "vigenciaFin", "eppAdicional", "procedimientosAlternativos", "companeroApoyo"].forEach(k => poner(k, d[k]));
  if(d.area && areas.includes(d.area)){ poner("area", d.area); avisar("areaSelect"); }
  if(d.tema){
    if(!d.temaOtro && areas.includes(d.tema)) poner("tema", d.tema); else { poner("tema", OTRO); poner("temaOtro", d.tema); }
    avisar("temaSelect");
  }
  if(d.tipoEspecifico){
    const sel = form.querySelector('[name="tipoEspecifico"]');
    if(!d.tipoEspecificoOtro && [...sel.options].some(o => o.value === d.tipoEspecifico)) poner("tipoEspecifico", d.tipoEspecifico);
    else { poner("tipoEspecifico", OTRO); poner("tipoEspecificoOtro", d.tipoEspecifico); }
    avisar("tipoEspecificoSelect");
  }
  if(d.condicionSeguridad) poner("condicionSeguridad", d.condicionSeguridad);
  if(d.tipoGestion){
    poner("tipoGestion", d.tipoGestion);
    const radio = form.querySelector(`[name="alcanceDerogacion"][value="${d.alcanceDerogacion === "Definitiva" ? "Definitiva" : "Temporal"}"]`);
    if(radio) radio.checked = true;
    if(d.fechaEfectiva) poner("fechaEfectiva", d.fechaEfectiva);
    avisar("tipoGestionSelect");
  }
  if(d.criticidad) poner("criticidad", d.criticidad);
  const rec = form.querySelector('[name="recurrente"]'); if(rec) rec.checked = !!d.recurrente;
}
