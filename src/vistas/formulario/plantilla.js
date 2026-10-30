// El HTML del formulario: lo que ve la persona, sin la lógica de los botones (eso vive en montar.js).
import { esc } from "../../util/html.js";
import { CRITICIDADES_DESVIACION, LINEAS_NEGOCIO, MAX_FILE_MB, MAX_FILES_BATCH } from "../../dominio/constantes.js";
import { TIPO_GESTION_DESC, OTRO, OTRO_LABEL } from "../../dominio/presentacion.js";
import { emptyD8 } from "../../dominio/d8.js";
import { nowLocal, todayISO } from "../../util/fechas.js";
import { icon } from "../../componentes/iconos.js";
import { fmtFecha } from "../../util/formato.js";
import { adjuntosHTML } from "../../componentes/listaAdjuntos.js";
import { d8HTML } from "../../componentes/editor8d.js";

export const listaPendientes = (f) => adjuntosHTML(f.archivos.map(a => ({nombre: a.name, tamano: a.size})), {vacio: "Aún no ha agregado archivos.", quitable: true});

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
        <div class="field"><label>Fecha y hora<input type="datetime-local" name="fechaHora" value="${nowLocal()}" required></label></div>
        <div class="field"><label>Nombre y apellido<input type="text" name="reportadoPor" value="${esc(u.nombre)}" required></label></div>
      </div>
      <div class="row3">
        <div class="field"><label>Cargo<input type="text" name="cargo" required></label></div>
        <div class="field"><label>Área (según organigrama)<input type="text" name="areaSolicitante" required></label></div>
        <div class="field"><label>Proceso<input type="text" name="procesoSolicitante" required></label></div>
      </div>
      <p class="hint" style="margin:0;">Quien diligencia la solicitud es el <b>Responsable del proceso</b>: la firma, hace el seguimiento y la cierra cuando termine la actividad. La evaluación y aprobación la hace el Aprobador autorizado.</p>
    </fieldset>

    <fieldset><legend>2. Clasificación y proyecto</legend>
      <div class="row2">
        <div class="field"><label>Solicitud dirigida al área de
          <select name="area" id="areaSelect">${areas.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("")}</select></label></div>
        <div class="field"><label>Solicitud relacionada con temas de
          <select name="tema" id="temaSelect">${areas.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("")}<option value="${OTRO}">${OTRO_LABEL}</option></select></label>
          <input type="text" name="temaOtro" id="temaOtroInput" maxlength="120" placeholder="Escriba el tema de su solicitud" style="display:none;margin-top:6px;">
          <div class="hint">Por defecto es el mismo del área. Si ninguno se ajusta a su reporte, elija "${OTRO_LABEL}" y escríbalo.</div></div>
      </div>
      <div class="field"><label>Tipo específico de Desviación o Derogación
        <select name="tipoEspecifico" id="tipoEspecificoSelect"></select></label>
        <input type="text" name="tipoEspecificoOtro" id="tipoOtroInput" maxlength="150" placeholder="Describa el tipo específico de desviación o derogación" style="display:none;margin-top:6px;">
        <div class="hint" id="tipoDescHint"></div>
        <div id="gtcWrap" style="display:none;margin-top:10px;"><label><span id="gtcLabel">Condición de seguridad específica (GTC 45)</span>
          <select name="condicionSeguridad" id="gtcSelect"></select></label>
          <div class="hint">Clasificación según la tabla de peligros del Anexo A de la GTC 45.</div></div>
      </div>
      <div class="row3">
        <div class="field"><label>OT<input type="text" name="ot" placeholder="Ej. OT-2026-045" required></label></div>
        <div class="field"><label>Nombre del proyecto<input type="text" name="proyecto" placeholder="Ej. Línea de corrugado Cliente XYZ" required></label></div>
        <div class="field"><label>Línea de negocio<select name="lineaNegocio" required><option value="">Seleccione…</option>${LINEAS_NEGOCIO.map(l => `<option>${esc(l)}</option>`).join("")}</select></label></div>
      </div>
      <div class="row2">
        <div class="field"><label>Figura: Desviación o Derogación
          <select name="tipoGestion" id="tipoGestionSelect"><option>Desviación</option><option>Derogación</option></select></label>
          <div class="hint" id="tipoGestionHint">${esc(TIPO_GESTION_DESC["Desviación"])}</div></div>
        <div class="field"><label>Nivel de criticidad
          <select name="criticidad" id="criticidadSelect">${CRITICIDADES_DESVIACION.map(c => `<option>${esc(c)}</option>`).join("")}</select></label></div>
      </div>
      <label class="checkline"><input type="checkbox" name="recurrente"> Es una condición recurrente</label>
      <div id="derogacionWarning" class="banner banner-red" style="display:none;margin-top:12px;">${icon("alert")} Al seleccionar Derogación se habilita el Reporte 8D. Diligencie lo que conozca; debe quedar completo antes de aprobar la evaluación.</div>
    </fieldset>

    <fieldset><legend id="lblFieldsetDesc">3. Descripción de la desviación</legend>
      <div class="row2">
        <div class="field"><label>Política, estándar, procedimiento o requisito incumplido<input type="text" name="requisitoIncumplido" required></label></div>
        <div class="field"><label>Equipo, herramienta, método o procedimiento involucrado<input type="text" name="equipoInvolucrado" required></label></div>
      </div>
      <div class="field"><label>Descripción breve de la tarea o requerimiento a realizar<textarea name="tareaDescripcion" rows="2" required></textarea></label></div>
      <div class="field"><label><span id="lblMotivo">Motivo por el cual se requiere la desviación</span><textarea name="motivoDesviacion" rows="2" required></textarea></label></div>
      <div class="field"><label>Consecuencias potenciales<textarea name="consecuenciasPotenciales" rows="2" required></textarea></label></div>
      <div class="field"><label><span id="lblMedidasControl">Medidas de control implementadas durante la desviación</span><textarea name="controlesCompensatorios" rows="2" required></textarea></label></div>
      <div class="field" id="alcanceDerogWrap" style="display:none;"><label>La derogación es</label>
        <div class="radio-line">
          <label class="checkline" style="margin:0;"><input type="radio" name="alcanceDerogacion" value="Temporal" checked> Temporal</label>
          <label class="checkline" style="margin:0;"><input type="radio" name="alcanceDerogacion" value="Definitiva"> Definitiva</label></div>
        <div class="hint">Temporal: registre el rango de fechas en que aplica. Definitiva: registre la fecha a partir de la cual se hace efectiva de forma permanente.</div></div>
      <div class="row2" id="vigenciaRango">
        <div class="field"><label><span id="lblVigIni">Vigencia — inicio</span><input type="date" name="vigenciaInicio" value="${todayISO(0)}"></label></div>
        <div class="field"><label><span id="lblVigFin">Vigencia — fin</span><input type="date" name="vigenciaFin" value="${todayISO(7)}"></label></div>
      </div>
      <div class="field" id="fechaEfectivaWrap" style="display:none;max-width:340px;"><label>Fecha a partir de la cual es efectiva de forma permanente
        <input type="date" name="fechaEfectiva" value="${todayISO(0)}"></label></div>
      <div class="field"><label>Adjuntar evidencias (fotos, PDF, Word, Excel…)
        <input type="file" id="inputArchivos" multiple></label>
        <div class="hint">Puede seleccionar varios archivos a la vez y volver a usar el botón para agregar más (máx. ${MAX_FILE_MB} MB por archivo, ${MAX_FILES_BATCH} por cargue). Las fotos se reducen automáticamente.</div>
        <div id="listaArchivos">${listaPendientes(f)}</div></div>
    </fieldset>

    <fieldset id="sstFieldset" style="display:none;"><legend>Detalle de Seguridad y Salud en el Trabajo (SST)</legend>
      <p class="hint" style="margin:0 0 10px;">Se diligencia porque la solicitud está dirigida al área de Seguridad y Salud en el Trabajo.</p>
      <div class="row2">
        <div class="field"><label>EPP adicionales requeridos<input type="text" name="eppAdicional"></label></div>
        <div class="field"><label>Procedimientos alternativos<input type="text" name="procedimientosAlternativos"></label></div>
      </div>
      <div class="field"><label>Compañero de apoyo<input type="text" name="companeroApoyo"></label></div>
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
