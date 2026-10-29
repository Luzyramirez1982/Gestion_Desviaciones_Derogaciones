// Formulario de nuevo registro: área, tipo específico (con "Otro"), GTC 45 para SST, vigencia, 8D, firma,
// borradores y reenvío de solicitudes devueltas.
import { esc } from "../util/html.js";
import { AREA_SST, CRITICIDADES, CRITICIDADES_DESVIACION, LINEAS_NEGOCIO, MODELO_REGISTRO, MAX_FILE_MB, MAX_FILES_BATCH, STAGES } from "../dominio/constantes.js";
import { TIPO_GESTION_DESC, OTRO, OTRO_LABEL } from "../dominio/presentacion.js";
import { gtcOptions, gtcLabel } from "../dominio/gtc45.js";
import { emptyD8 } from "../dominio/d8.js";
import { validarVigencia } from "../dominio/registro.js";
import { nowLocal, todayISO } from "../util/fechas.js";
import { icon } from "../componentes/iconos.js";
import { fmtFecha } from "../util/formato.js";
import { adjuntosHTML } from "../componentes/listaAdjuntos.js";
import { confirmar } from "../componentes/dialogos.js";
import { d8HTML, enlazarD8 } from "../componentes/editor8d.js";
import { montarFirma } from "../componentes/firma.js";
import { prepararArchivos } from "../componentes/adjuntos.js";
import { abrirInstructivo8D } from "./ayuda.js";

// Antes de mostrar el formulario se carga el borrador (si se abrió uno) o se deja en blanco.
export async function preparar(ctx){
  const clave = ctx.parametro || "";
  if(ctx.formulario && ctx.formulario.clave === clave) return;
  const f = {clave, rec: null, d8: emptyD8(), archivos: [], aviso: ""};
  if(clave){
    try { f.rec = await ctx.repo.cargarRegistro(clave); if(f.rec.d8) f.d8 = structuredClone(f.rec.d8); }
    catch(e){ ctx.error(e); }
    if(f.rec && !(f.rec.borrador && f.rec.reportadoPorId === ctx.yo.id)){ f.rec = null; }
  }
  ctx.formulario = f;
}

export function html(ctx){
  if(ctx.creado) return tarjetaCreado(ctx);
  const f = ctx.formulario || {rec: null, archivos: []};
  const u = ctx.yo, areas = ctx.nombresAreas();
  const borradores = ctx.misBorradores();
  const editando = f.rec;
  return `
  ${borradores.length ? `<div class="card" style="max-width:760px;margin-bottom:14px;border-color:#fde68a;background:#fffbeb;">
    <h3>${icon("clip")} Sus borradores y solicitudes devueltas (${borradores.length})</h3>
    ${borradores.map(b => `<div class="row" style="cursor:default;background:#fff;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;"><div class="row-top" style="align-items:center;">
      <div><div class="row-title">${esc(b.devuelta ? b.id : "Borrador")} · ${esc(b.tipoEspecifico || "Sin tipo")} ${b.devuelta ? `<span class="badge" style="background:#ffedd5;color:#c2410c;">Devuelta para ajustes</span>` : `<span class="badge" style="background:#fef3c7;color:#92400e;">Borrador</span>`}</div>
        <div class="row-sub">Guardado: ${esc(fmtFecha(b.actualizadoEn) || "—")} · ${esc(b.area || "")}${b.devuelta && b.motivoDevolucion ? " · Motivo: " + esc(b.motivoDevolucion) : ""}</div></div>
      <button type="button" class="btn btn-primary btn-sm" data-continuar="${esc(b.id)}">${icon("edit")} ${editando && editando.id === b.id ? "Editando — recargar" : "Continuar editando"}</button>
    </div></div>`).join("")}</div>` : ""}
  ${f.aviso ? `<div class="banner banner-green" style="max-width:760px;">${icon("check")} ${esc(f.aviso)}</div>` : ""}
  ${editando ? `<div class="banner banner-slate" style="max-width:760px;">${icon("clip")} <span>Está continuando ${editando.devuelta ? "la solicitud devuelta <b>" + esc(editando.id) + "</b>" : "un borrador"}. Puede volver a guardarlo o enviarlo. <a href="#/nuevo" data-nuevo-limpio>Empezar una solicitud nueva</a></span></div>` : ""}
  <form id="formNuevo" style="max-width:760px;" novalidate>
    <fieldset><legend>1. Información del solicitante (Responsable del proceso)</legend>
      <div class="row2">
        <div class="field"><label>Fecha y hora</label><input type="datetime-local" name="fechaHora" value="${nowLocal()}" required></div>
        <div class="field"><label>Nombre y apellido</label><input type="text" name="reportadoPor" value="${esc(u.nombre)}" required></div>
      </div>
      <div class="row3">
        <div class="field"><label>Cargo</label><input type="text" name="cargo" required></div>
        <div class="field"><label>Área (según organigrama)</label><input type="text" name="areaSolicitante" required></div>
        <div class="field"><label>Proceso</label><input type="text" name="procesoSolicitante" required></div>
      </div>
      <p class="hint" style="margin:0;">Quien diligencia la solicitud es el <b>Responsable del proceso</b>: la firma, hace el seguimiento y la cierra cuando termine la actividad. La evaluación y aprobación la hace el Aprobador autorizado.</p>
    </fieldset>

    <fieldset><legend>2. Clasificación y proyecto</legend>
      <div class="row2">
        <div class="field"><label>Solicitud dirigida al área de</label>
          <select name="area" id="areaSelect">${areas.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("")}</select></div>
        <div class="field"><label>Solicitud relacionada con temas de</label>
          <select name="tema" id="temaSelect">${areas.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("")}<option value="${OTRO}">${OTRO_LABEL}</option></select>
          <input type="text" name="temaOtro" id="temaOtroInput" maxlength="120" placeholder="Escriba el tema de su solicitud" style="display:none;margin-top:6px;">
          <div class="hint">Por defecto es el mismo del área. Si ninguno se ajusta a su reporte, elija "${OTRO_LABEL}" y escríbalo.</div></div>
      </div>
      <div class="field"><label>Tipo específico de Desviación o Derogación</label>
        <select name="tipoEspecifico" id="tipoEspecificoSelect"></select>
        <input type="text" name="tipoEspecificoOtro" id="tipoOtroInput" maxlength="150" placeholder="Describa el tipo específico de desviación o derogación" style="display:none;margin-top:6px;">
        <div class="hint" id="tipoDescHint"></div>
        <div id="gtcWrap" style="display:none;margin-top:10px;"><label id="gtcLabel">Condición de seguridad específica (GTC 45)</label>
          <select name="condicionSeguridad" id="gtcSelect"></select>
          <div class="hint">Clasificación según la tabla de peligros del Anexo A de la GTC 45.</div></div>
      </div>
      <div class="row3">
        <div class="field"><label>OT</label><input type="text" name="ot" placeholder="Ej. OT-2026-045" required></div>
        <div class="field"><label>Nombre del proyecto</label><input type="text" name="proyecto" placeholder="Ej. Línea de corrugado Cliente XYZ" required></div>
        <div class="field"><label>Línea de negocio</label><select name="lineaNegocio" required><option value="">Seleccione…</option>${LINEAS_NEGOCIO.map(l => `<option>${esc(l)}</option>`).join("")}</select></div>
      </div>
      <div class="row2">
        <div class="field"><label>Figura: Desviación o Derogación</label>
          <select name="tipoGestion" id="tipoGestionSelect"><option>Desviación</option><option>Derogación</option></select>
          <div class="hint" id="tipoGestionHint">${esc(TIPO_GESTION_DESC["Desviación"])}</div></div>
        <div class="field"><label>Nivel de criticidad</label>
          <select name="criticidad" id="criticidadSelect">${CRITICIDADES_DESVIACION.map(c => `<option>${esc(c)}</option>`).join("")}</select></div>
      </div>
      <label class="checkline"><input type="checkbox" name="recurrente"> Es una condición recurrente</label>
      <div id="derogacionWarning" class="banner banner-red" style="display:none;margin-top:12px;">${icon("alert")} Al seleccionar Derogación se habilita el Reporte 8D. Diligencie lo que conozca; debe quedar completo antes de aprobar la evaluación.</div>
    </fieldset>

    <fieldset><legend id="lblFieldsetDesc">3. Descripción de la desviación</legend>
      <div class="row2">
        <div class="field"><label>Política, estándar, procedimiento o requisito incumplido</label><input type="text" name="requisitoIncumplido" required></div>
        <div class="field"><label>Equipo, herramienta, método o procedimiento involucrado</label><input type="text" name="equipoInvolucrado" required></div>
      </div>
      <div class="field"><label>Descripción breve de la tarea o requerimiento a realizar</label><textarea name="tareaDescripcion" rows="2" required></textarea></div>
      <div class="field"><label id="lblMotivo">Motivo por el cual se requiere la desviación</label><textarea name="motivoDesviacion" rows="2" required></textarea></div>
      <div class="field"><label>Consecuencias potenciales</label><textarea name="consecuenciasPotenciales" rows="2" required></textarea></div>
      <div class="field"><label id="lblMedidasControl">Medidas de control implementadas durante la desviación</label><textarea name="controlesCompensatorios" rows="2" required></textarea></div>
      <div class="field" id="alcanceDerogWrap" style="display:none;"><label>La derogación es</label>
        <div class="radio-line">
          <label class="checkline" style="margin:0;"><input type="radio" name="alcanceDerogacion" value="Temporal" checked> Temporal</label>
          <label class="checkline" style="margin:0;"><input type="radio" name="alcanceDerogacion" value="Definitiva"> Definitiva</label></div>
        <div class="hint">Temporal: registre el rango de fechas en que aplica. Definitiva: registre la fecha a partir de la cual se hace efectiva de forma permanente.</div></div>
      <div class="row2" id="vigenciaRango">
        <div class="field"><label id="lblVigIni">Vigencia — inicio</label><input type="date" name="vigenciaInicio" value="${todayISO(0)}"></div>
        <div class="field"><label id="lblVigFin">Vigencia — fin</label><input type="date" name="vigenciaFin" value="${todayISO(7)}"></div>
      </div>
      <div class="field" id="fechaEfectivaWrap" style="display:none;max-width:340px;"><label>Fecha a partir de la cual es efectiva de forma permanente</label>
        <input type="date" name="fechaEfectiva" value="${todayISO(0)}"></div>
      <div class="field"><label>Adjuntar evidencias (fotos, PDF, Word, Excel…)</label>
        <input type="file" id="inputArchivos" multiple>
        <div class="hint">Puede seleccionar varios archivos a la vez y volver a usar el botón para agregar más (máx. ${MAX_FILE_MB} MB por archivo, ${MAX_FILES_BATCH} por cargue). Las fotos se reducen automáticamente.</div>
        <div id="listaArchivos">${listaPendientes(f)}</div></div>
    </fieldset>

    <fieldset id="sstFieldset" style="display:none;"><legend>Detalle de Seguridad y Salud en el Trabajo (SST)</legend>
      <p class="hint" style="margin:0 0 10px;">Se diligencia porque la solicitud está dirigida al área de Seguridad y Salud en el Trabajo.</p>
      <div class="row2">
        <div class="field"><label>EPP adicionales requeridos</label><input type="text" name="eppAdicional"></div>
        <div class="field"><label>Procedimientos alternativos</label><input type="text" name="procedimientosAlternativos"></div>
      </div>
      <div class="field"><label>Compañero de apoyo</label><input type="text" name="companeroApoyo"></div>
    </fieldset>

    <fieldset id="d8Fieldset" style="display:none;"><legend>4. Reporte 8D (obligatorio en toda derogación — se completa a más tardar en la Evaluación)</legend>
      <div style="margin:-4px 0 10px;"><button type="button" class="btn btn-outline btn-sm" id="btnInstructivo8D">${icon("help")} Ver instructivo de diligenciamiento del 8D</button></div>
      <p class="hint" style="margin:0 0 10px;">Los campos que aún no tenga claros puede completarlos con su mejor estimación inicial y ajustarlos más adelante desde el detalle del registro.</p>
      <div id="cajaD8">${d8HTML(f.d8 || emptyD8(), {personas: ctx.base.perfiles})}</div>
    </fieldset>

    <fieldset><legend id="lblFirma">Firma del Responsable del proceso</legend>
      <p class="hint" style="margin:0 0 10px;">Dibuje su firma con el mouse o el dedo. Al firmar, usted certifica que la información suministrada es veraz.</p>
      <div class="field"><canvas id="firmaCanvas" width="420" height="130" style="border:1px solid var(--border);border-radius:8px;background:#fff;touch-action:none;cursor:crosshair;max-width:100%;"></canvas>
        <div style="margin-top:6px;"><button type="button" class="btn btn-outline btn-sm" id="btnLimpiarFirma">${icon("x")} Limpiar firma</button></div></div>
      <label class="checkline"><input type="checkbox" name="confirmaVeraz"> Confirmo que la información suministrada es veraz.</label>
    </fieldset>

    <div class="callout">${icon("mail")} Al enviar se asigna el <b>consecutivo</b> (MTC-###) y la solicitud pasa a <b>Evaluación y Aprobación</b>. Si aún no termina, use <b>Guardar borrador</b> (no requiere firma) y continúe después desde esta misma pantalla.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
      <button type="button" id="btnBorrador" class="btn btn-outline" style="flex:1;justify-content:center;">${icon("clip")} Guardar borrador</button>
      <button type="submit" id="btnEnviar" class="btn btn-primary" style="flex:2;justify-content:center;">${icon("check")} Firmar y enviar solicitud</button>
    </div>
  </form>`;
}

const listaPendientes = (f) => adjuntosHTML(f.archivos.map(a => ({nombre: a.name, tamano: a.size})), {vacio: "Aún no ha agregado archivos.", quitable: true});

function tarjetaCreado(ctx){
  const r = ctx.creado;
  const aprobadores = ctx.base.perfiles.filter(p => p.rol === "Aprobador autorizado" && p.activo);
  return `<div class="card" style="max-width:640px;margin:0 auto;text-align:center;padding:28px 22px;">
    <div style="width:52px;height:52px;border-radius:99px;background:var(--green-bg);color:var(--green);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">${icon("check")}</div>
    <h2 style="margin:0 0 6px;font-size:18px;color:#0f172a;">Su solicitud fue registrada</h2>
    <p style="margin:0 0 18px;color:var(--muted);font-size:13.5px;">Guarde este consecutivo: con él puede consultar en cualquier momento el estado de su solicitud.</p>
    <div style="display:inline-block;border:2px dashed var(--navy);border-radius:12px;padding:12px 26px;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;">Consecutivo asignado</div>
      <div style="font-size:30px;font-weight:800;color:var(--navy);letter-spacing:.04em;" id="consecutivoCreado">${esc(r.id)}</div></div>
    <div class="kv" style="text-align:left;max-width:460px;margin:0 auto 16px;">
      <div><div class="k">Figura</div><div class="v">${esc(r.tipoGestion)}</div></div>
      <div><div class="k">Área</div><div class="v">${esc(r.area)}</div></div>
      <div><div class="k">Archivos adjuntos</div><div class="v">${r.adjuntos.length}</div></div>
      <div><div class="k">Estado</div><div class="v">En evaluación y aprobación</div></div></div>
    ${ctx.creadoAvisos && ctx.creadoAvisos.length ? `<div class="banner banner-amber" style="text-align:left;">${icon("alert")} <span>${ctx.creadoAvisos.map(esc).join("<br>")}<br>Puede agregar los archivos desde el detalle del registro.</span></div>` : ""}
    <div class="banner banner-slate" style="text-align:left;">${icon("mail")} <span>La solicitud pasó a <b>Evaluación y Aprobación</b>. Le corresponde evaluarla a ${aprobadores.length ? aprobadores.map(a => "<b>" + esc(a.nombre) + "</b>").join(", ") + " (Aprobador autorizado)" : "los Aprobadores autorizados"}.</span></div>
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px;">
      <button class="btn btn-primary" data-ir-lista>${icon("list")} Ver registros</button>
      <button class="btn btn-outline" data-otra>${icon("plus")} Registrar otra solicitud</button></div></div>`;
}

export function montar(ctx, el){
  if(ctx.creado){
    el.querySelector("[data-ir-lista]").addEventListener("click", () => { ctx.creado = null; ctx.ir("registros"); });
    el.querySelector("[data-otra]").addEventListener("click", () => { ctx.creado = null; ctx.formulario = null; ctx.parametro = ""; ctx.ir("nuevo"); });
    return;
  }
  const f = ctx.formulario, form = el.querySelector("#formNuevo");
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

  // ----- 8D, archivos y firma -----
  const dentro8D = el.querySelector("#d8Fieldset");
  enlazarD8(dentro8D, f.d8, {personas: ctx.base.perfiles});
  $("btnInstructivo8D").addEventListener("click", abrirInstructivo8D);

  const pintarArchivos = () => { $("listaArchivos").innerHTML = listaPendientes(f); };
  $("inputArchivos").addEventListener("change", async e => {
    const { validos, avisos } = await prepararArchivos(e.target.files, {yaHay: f.archivos.length});
    f.archivos.push(...validos);
    e.target.value = "";
    avisos.forEach(a => ctx.error(new Error(a)));
    pintarArchivos();
  });
  $("listaArchivos").addEventListener("click", e => {
    const q = e.target.closest("[data-quitar-pendiente]");
    if(q){ f.archivos.splice(Number(q.dataset.quitarPendiente), 1); pintarArchivos(); }
  });

  const firma = montarFirma($("firmaCanvas"));
  ctx.firmaFormulario = firma;
  $("btnLimpiarFirma").addEventListener("click", () => firma.limpiar());

  el.querySelectorAll("[data-continuar]").forEach(b => b.addEventListener("click", () => {
    ctx.formulario = null; ctx.ir("nuevo/" + b.dataset.continuar);
  }));
  const nuevoLimpio = el.querySelector("[data-nuevo-limpio]");
  if(nuevoLimpio) nuevoLimpio.addEventListener("click", e => { e.preventDefault(); ctx.formulario = null; ctx.ir("nuevo"); });

  // ----- Rellenar con lo guardado en el borrador -----
  if(f.rec) rellenar(form, f.rec, ctx);
  sincronizarGestion();

  // ----- Guardar y enviar -----
  const leer = () => datosDelFormulario(form, ctx, f);
  async function subirPendientes(id){
    const fallidos = [];
    for(const a of f.archivos){
      try { await ctx.repo.subirAdjunto(id, a); } catch(e){ fallidos.push(`${a.name}: ${e.message}`); }
    }
    f.archivos = [];
    return fallidos;
  }
  $("btnBorrador").addEventListener("click", async () => {
    const btn = $("btnBorrador"); btn.disabled = true;
    try {
      const datos = leer();
      const rec = f.rec
        ? await ctx.repo.guardarRegistro(f.rec.id, f.rec.version, {...f.rec, ...datos})
        : await ctx.repo.crearRegistro({data: datos, borrador: true});
      const fallidos = await subirPendientes(rec.id);
      fallidos.forEach(m => ctx.error(new Error(m)));
      await ctx.recargar();
      ctx.formulario = {clave: rec.id, rec: await ctx.repo.cargarRegistro(rec.id), d8: structuredClone(rec.d8 || emptyD8()), archivos: [],
        aviso: `Avance guardado (${fmtFecha(new Date().toISOString())}). Puede continuarlo después desde "Nuevo registro". La firma se pide solo al enviar.`};
      ctx.parametro = rec.id;
      location.hash = "#/nuevo/" + rec.id;
      ctx.render();
      window.scrollTo?.(0, 0);
    } catch(e){
      if(e.codigo === "conflicto_version") await avisoConflicto(ctx); else ctx.error(e);
      btn.disabled = false;
    }
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("btnEnviar");
    const oculto = (c) => c.closest('[style*="display:none"], [style*="display: none"]');
    const faltante = [...form.querySelectorAll("[required]")].find(c => !oculto(c) && !String(c.value).trim());
    if(faltante){
      faltante.focus();
      const nombre = faltante.closest(".field")?.querySelector("label")?.textContent || "un campo obligatorio";
      return ctx.error(new Error(`Falta completar «${nombre}». Si aún no termina, use «Guardar borrador».`));
    }
    if(!firma.hayFirma()) return ctx.error(new Error("Por favor dibuje su firma en el recuadro antes de enviar la solicitud."));
    if(!form.elements.confirmaVeraz.checked) return ctx.error(new Error("Marque la confirmación de que la información es veraz."));
    const datos = leer();
    const errVig = validarVigencia(datos);
    if(errVig) return ctx.error(new Error(errVig));
    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      const rec = f.rec
        ? await ctx.repo.enviarRegistro(f.rec.id, f.rec.version, {...f.rec, ...datos}, firma.imagen())
        : await ctx.repo.crearRegistro({data: datos, firma: firma.imagen()});
      const fallidos = await subirPendientes(rec.id);
      await ctx.recargar();
      ctx.creado = await ctx.repo.cargarRegistro(rec.id);
      ctx.creadoAvisos = fallidos.length ? ["No se pudieron subir algunos archivos:", ...fallidos] : [];
      ctx.formulario = null; ctx.parametro = "";
      location.hash = "#/nuevo";
      ctx.render();
    } catch(err){
      if(err.codigo === "conflicto_version") await avisoConflicto(ctx); else ctx.error(err);
      btn.disabled = false; btn.innerHTML = `${icon("check")} Firmar y enviar solicitud`;
    }
  });
}

async function avisoConflicto(ctx){
  const recargar = await confirmar("Alguien más cambió esta solicitud",
    "Otra persona modificó este registro mientras usted lo editaba. Para no pisar su trabajo, no se guardó nada. ¿Desea recargar la versión más reciente? (Lo que escribió en pantalla se perderá.)",
    {aceptar: "Recargar", cancelar: "Quedarme aquí"});
  if(recargar){ ctx.formulario = null; await ctx.recargar(); await preparar(ctx); ctx.render(); }
}

// Lee el formulario y arma el contenido del registro (lo mismo que ya guardaba la versión 1).
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

// Vuelve a poner en el formulario lo que se guardó en el borrador (o en la solicitud devuelta).
function rellenar(form, d, ctx){
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
