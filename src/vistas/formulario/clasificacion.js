// Conecta los campos que dependen unos de otros: área → tema → tipo específico → GTC 45 (SST),
// y figura (Desviación/Derogación) → criticidad, vigencia y si se muestra el 8D.
import { esc } from "../../util/html.js";
import { AREA_SST, CRITICIDADES, CRITICIDADES_DESVIACION } from "../../dominio/constantes.js";
import { TIPO_GESTION_DESC, OTRO, OTRO_LABEL } from "../../dominio/presentacion.js";
import { gtcOptions, gtcLabel } from "../../dominio/gtc45.js";

export function enlazarClasificacion(el, form, ctx){
  const $ = (id) => el.querySelector("#" + id);
  const tiposDe = (tema) => ctx.base.tipos.filter(t => t.area === tema);

  // ----- Área, tema y tipo específico -----
  const areaSel = $("areaSelect"), temaSel = $("temaSelect"), tipoSel = $("tipoEspecificoSelect");
  const temaActual = () => temaSel.value !== OTRO ? temaSel.value : "";
  function sincronizarSST(){
    const esSST = areaSel.value === AREA_SST || temaActual() === AREA_SST;
    $("sstFieldset").style.display = esSST ? "block" : "none";
    const sel = $("gtcSelect"), peligro = tipoSel.value === OTRO ? "" : tipoSel.value;
    const opciones = esSST ? gtcOptions(peligro) : [];
    if(sel.dataset.peligro !== peligro){
      sel.innerHTML = `<option value="">Seleccione…</option>` + gtcOptions(peligro).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
      sel.dataset.peligro = peligro;
    }
    $("gtcLabel").textContent = gtcLabel(peligro);
    $("gtcWrap").style.display = opciones.length ? "block" : "none";
    sel.required = opciones.length > 0;
  }
  function sincronizarTipo(){
    const t = tiposDe(temaActual()).find(x => x.nombre === tipoSel.value);
    $("tipoDescHint").textContent = tipoSel.value === OTRO ? "Escriba el tipo específico si no lo encuentra en la lista." : (t && t.desc) || "";
    $("temaOtroInput").style.display = temaSel.value === OTRO ? "block" : "none";
    $("temaOtroInput").required = temaSel.value === OTRO;
    $("tipoOtroInput").style.display = tipoSel.value === OTRO ? "block" : "none";
    $("tipoOtroInput").required = tipoSel.value === OTRO;
    sincronizarSST();
  }
  function opcionesTipo(){
    const lista = tiposDe(temaActual());
    tipoSel.innerHTML = lista.map(t => `<option value="${esc(t.nombre)}">${esc(t.nombre)}</option>`).join("") + `<option value="${OTRO}">${OTRO_LABEL}</option>`;
    if(!lista.length) tipoSel.value = OTRO;
    sincronizarTipo();
  }
  areaSel.addEventListener("change", () => { if(temaSel.value !== OTRO) temaSel.value = areaSel.value; opcionesTipo(); });
  temaSel.addEventListener("change", opcionesTipo);
  tipoSel.addEventListener("change", sincronizarTipo);
  temaSel.value = areaSel.value;
  opcionesTipo();

  // ----- Figura, criticidad, vigencia -----
  const gestion = $("tipoGestionSelect");
  const esDerogacion = () => gestion.value === "Derogación";
  function sincronizarAlcance(){
    const definitiva = esDerogacion() && form.querySelector('[name="alcanceDerogacion"]:checked').value === "Definitiva";
    $("alcanceDerogWrap").style.display = esDerogacion() ? "block" : "none";
    $("vigenciaRango").style.display = definitiva ? "none" : "";
    $("fechaEfectivaWrap").style.display = definitiva ? "block" : "none";
    const temporal = esDerogacion() && !definitiva;
    form.elements.fechaEfectiva.required = definitiva;
    form.elements.vigenciaInicio.required = temporal; form.elements.vigenciaFin.required = temporal;
    $("lblVigIni").textContent = temporal ? "Vigencia temporal — desde" : "Vigencia — inicio";
    $("lblVigFin").textContent = temporal ? "Vigencia temporal — hasta" : "Vigencia — fin";
  }
  function sincronizarGestion(){
    const palabra = esDerogacion() ? "derogación" : "desviación";
    $("derogacionWarning").style.display = esDerogacion() ? "flex" : "none";
    $("tipoGestionHint").textContent = TIPO_GESTION_DESC[gestion.value];
    $("lblFieldsetDesc").textContent = `3. Descripción de la ${palabra}`;
    $("lblMotivo").textContent = `Motivo por el cual se requiere la ${palabra}`;
    $("lblMedidasControl").textContent = `Medidas de control implementadas durante la ${palabra}`;
    $("d8Fieldset").style.display = esDerogacion() ? "block" : "none";
    const crit = $("criticidadSelect"), opciones = esDerogacion() ? CRITICIDADES : CRITICIDADES_DESVIACION, previa = crit.value;
    crit.innerHTML = opciones.map(c => `<option>${esc(c)}</option>`).join("");
    if(opciones.includes(previa)) crit.value = previa;
    sincronizarAlcance();
  }
  gestion.addEventListener("change", sincronizarGestion);
  form.querySelectorAll('[name="alcanceDerogacion"]').forEach(r => r.addEventListener("change", sincronizarAlcance));

  return { sincronizarGestion };
}
