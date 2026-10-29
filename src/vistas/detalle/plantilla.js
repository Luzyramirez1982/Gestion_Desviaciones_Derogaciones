// El HTML del detalle: lo que ve la persona. La lógica de los botones vive en montar.js.
import { esc } from "../../util/html.js";
import { STAGES, STAGE_ROLE, FIRMA_SLOTS, MAX_FILE_MB, MAX_FILES_BATCH } from "../../dominio/constantes.js";
import { STAGE_COLORS } from "../../dominio/presentacion.js";
import { gtcLabel } from "../../dominio/gtc45.js";
import { d8Faltantes, is8DComplete } from "../../dominio/d8.js";
import { isClosed, esDueno, canSignSlot, vigenciaTexto } from "../../dominio/registro.js";
import { correoDeAviso } from "../../dominio/mensajes.js";
import { daysUntil } from "../../util/fechas.js";
import { fmtFecha } from "../../util/formato.js";
import { icon } from "../../componentes/iconos.js";
import { areaBadge, tipoGestionBadge, criticidadBadge } from "../../componentes/insignias.js";
import { adjuntosHTML } from "../../componentes/listaAdjuntos.js";
import { d8HTML } from "../../componentes/editor8d.js";

export function html(ctx){
  const { rec } = ctx.abierto, u = ctx.yo;
  const cerrado = isClosed(rec);
  const palabra = rec.tipoGestion === "Derogación" ? "derogación" : "desviación";
  const dueno = esDueno(u, rec), esAprob = u.rol === "Aprobador autorizado", admin = ctx.esAdmin();
  const enEval = !cerrado && !rec.borrador && rec.stage === 1;
  const puedeAprobar = enEval && (esAprob || admin);
  const puedeCerrar = !cerrado && rec.stage === 2 && dueno;
  const puede8D = enEval && (esAprob || admin || dueno);
  const vencD = daysUntil(rec.vigenciaFin);
  const asignado = rec.stage === 2 ? rec.reportadoPor : "";
  const pistaEtapas = STAGES.map((s, i) => {
    const c = STAGE_COLORS[i], activa = i === rec.stage && !cerrado, hecha = i < rec.stage || cerrado;
    return `<span class="stage-chip ${activa ? "active" : ""} ${hecha ? "done" : ""}" style="${activa ? `background:${c.bg};color:${c.fg};` : ""}">${i + 1}. ${esc(s)}${hecha ? " ✓" : ""}</span>`;
  }).join("");
  const puedeConvertir = rec.tipoGestion === "Desviación" && enEval && (admin || esAprob);

  return `
  <div class="panel-overlay" id="panelOverlay"><div class="panel" id="panelBox">
    <div class="panel-head">
      <div><div style="font-size:11px;color:#94a3b8;font-weight:600;">${esc(rec.id)}</div>
        <div style="font-size:15.5px;font-weight:700;margin-top:2px;">${esc(rec.tipoEspecifico || rec.tipoGestion)}</div></div>
      <div style="display:flex;align-items:center;gap:10px;"><span id="estadoGuardado" class="estado-guardado"></span>
        <button class="panel-close" id="cerrarPanel" aria-label="Cerrar">${icon("x")}</button></div>
    </div>
    <div class="panel-body">
      <div id="avisoConflicto" class="banner banner-red" style="display:none;">${icon("alert")} <span><b>Otra persona cambió este registro</b> mientras usted lo editaba. Para no pisar su trabajo, no se guardó lo último que escribió.</span>
        <button class="btn btn-primary btn-sm" data-recargar-registro style="margin-left:auto;white-space:nowrap;">Recargar registro</button></div>
      ${rec.devuelta ? `<div class="banner banner-amber">${icon("alert")} <span><b>Devuelta para ajustes</b> por el Aprobador autorizado${rec.motivoDevolucion ? ": " + esc(rec.motivoDevolucion) : ""}. ${dueno ? "Corrija la solicitud y vuelva a firmarla y enviarla." : "Está en manos del Responsable del proceso que la hizo."}</span>
        ${dueno ? `<button class="btn btn-primary btn-sm" data-corregir="${esc(rec.id)}" style="margin-left:auto;white-space:nowrap;">Corregir y reenviar</button>` : ""}</div>` : ""}
      <div class="row-badges" style="margin-bottom:6px;">${areaBadge(rec.area, ctx.base.areas)} ${tipoGestionBadge(rec.tipoGestion)} ${criticidadBadge(rec.criticidad)}
        ${rec.recurrente ? `<span class="badge" style="background:#f1f5f9;color:#475569;">Recurrente</span>` : ""}</div>

      <div style="margin-top:14px;">
        <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.03em;">Ciclo de la solicitud</div>
        <div class="stage-track">${pistaEtapas}</div>
        ${cerrado ? (rec.resultado === "Rechazada" ? `<div class="banner banner-red">${icon("x")} Solicitud rechazada. Ver el motivo en la bitácora.</div>`
            : `<div class="banner banner-green">${icon("check")} Solicitud cerrada${rec.fechaCierre ? " el " + esc(fmtFecha(rec.fechaCierre)) : ""}.</div>`)
          : rec.devuelta ? "" : `<div class="banner banner-slate">${icon("alert")} <span>Etapa actual: <b>${esc(STAGES[rec.stage])}</b>. Le corresponde ${rec.stage === 2 ? "cerrar" : "evaluar, aprobar"} y firmar a: <b>${esc(STAGE_ROLE[rec.stage])}</b>${asignado ? " (" + esc(asignado) + ")" : ""}. Firme en «Firmas de aprobación», al final de esta pantalla.</span></div>`}
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          ${admin && !cerrado && rec.stage === 2 ? `<button class="btn btn-outline btn-sm" id="btnRetroceder">${icon("chevronLeft")} Etapa anterior</button>` : ""}
          <a class="btn btn-outline btn-sm" href="${esc(correoDeAviso(rec, ctx.base.perfiles))}" id="btnCorreo">${icon("mail")} Notificar por correo</a>
          ${cerrado ? `<button class="btn btn-primary btn-sm" id="btnPdf">${icon("download")} Descargar PDF de trazabilidad</button>` : ""}
          ${admin ? `<button class="btn btn-danger-outline btn-sm" id="btnEliminar" style="margin-left:auto;" title="Solo Administrador. Queda huella de quién, cuándo y por qué.">${icon("trash")} Eliminar registro</button>` : ""}
        </div>
        ${puedeAprobar ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <button class="btn btn-outline btn-sm" id="btnDevolver">${icon("chevronLeft")} Devolver al Responsable del proceso</button>
          <button class="btn btn-danger-outline btn-sm" id="btnRechazar">${icon("x")} Rechazar solicitud</button></div>
          <div class="hint" style="margin-top:4px;">Devolver y Rechazar exigen escribir el motivo en el comentario.</div>` : ""}
        ${!cerrado && !rec.devuelta ? `<div class="field" style="margin-top:10px;"><label>Comentario para la bitácora (opcional; obligatorio al devolver o rechazar)</label><textarea id="comentarioEtapa" rows="2" placeholder="Se guardará en la bitácora…"></textarea></div>` : ""}
      </div>

      ${rec.recurrente && puedeConvertir ? `<div class="banner banner-amber">${icon("repeat")} Esta desviación es recurrente. Evalúe si debe convertirse en derogación.
        <button class="btn btn-outline btn-sm" id="btnConvertir" style="margin-left:auto;white-space:nowrap;">Convertir en derogación (activa 8D)</button></div>` : ""}

      <div class="card" style="margin-top:6px;"><h3>1. Información del solicitante (Responsable del proceso)</h3><div class="kv" style="margin:0;">
        <div><div class="k">Fecha y hora</div><div class="v">${esc((rec.fechaHora || "").replace("T", " ") || fmtFecha(rec.creadoEn))}</div></div>
        <div><div class="k">Nombre y apellido (Responsable del proceso)</div><div class="v">${esc(rec.reportadoPor)}</div></div>
        <div><div class="k">Cargo</div><div class="v">${esc(rec.cargo || "—")}</div></div>
        <div><div class="k">Área (según organigrama)</div><div class="v">${esc(rec.areaSolicitante || "—")}</div></div>
        <div><div class="k">Proceso</div><div class="v">${esc(rec.procesoSolicitante || "—")}</div></div></div></div>

      <div class="card" style="margin-top:12px;"><h3>2. Clasificación y proyecto</h3><div class="kv" style="margin:0;">
        <div><div class="k">Solicitud dirigida al área de</div><div class="v">${esc(rec.area)}</div></div>
        <div><div class="k">Solicitud relacionada con temas de</div><div class="v">${esc(rec.tema || rec.area)}${rec.temaOtro ? ` <span class="hint">(escrito por el usuario)</span>` : ""}</div></div>
        <div class="full"><div class="k">Tipo específico de Desviación o Derogación</div><div class="v">${esc(rec.tipoEspecifico)}${rec.tipoEspecificoOtro ? ` <span class="hint">(escrito por el usuario)</span>` : ""}</div></div>
        ${rec.condicionSeguridad ? `<div><div class="k">${esc(gtcLabel(rec.peligroSST || rec.tipoEspecifico))}</div><div class="v">${esc(rec.condicionSeguridad)}</div></div>` : ""}
        <div><div class="k">OT</div><div class="v">${esc(rec.ot || "—")}</div></div>
        <div><div class="k">Nombre del proyecto</div><div class="v">${esc(rec.proyecto || "—")}</div></div>
        <div><div class="k">Línea de negocio</div><div class="v">${esc(rec.lineaNegocio || "—")}</div></div>
        <div><div class="k">Figura / Criticidad</div><div class="v">${esc(rec.tipoGestion)} · ${esc(rec.criticidad)}</div></div>
        ${rec.tipoGestion === "Derogación" && enEval && (dueno || esAprob || admin) ? alcanceHTML(rec) : ""}
        <div class="full"><div class="k">${rec.tipoGestion === "Derogación" ? "Alcance y vigencia de la derogación" : "Vigencia"}</div>
          <div class="v" style="${vencD !== null && vencD <= 3 && !cerrado ? "color:#dc2626;font-weight:600;" : ""}">${esc(vigenciaTexto(rec))}${vencD !== null && !cerrado ? ` (${vencD <= 0 ? "vencida" : vencD + " días restantes"})` : ""}</div></div>
      </div></div>

      <div class="card" style="margin-top:12px;"><h3>3. Descripción de la ${palabra}</h3><div class="kv" style="margin:0;">
        <div class="full"><div class="k">Política, estándar, procedimiento o requisito incumplido</div><div class="v">${esc(rec.requisitoIncumplido || "—")}</div></div>
        <div class="full"><div class="k">Equipo, herramienta, método o procedimiento involucrado</div><div class="v">${esc(rec.equipoInvolucrado || "—")}</div></div>
        <div class="full"><div class="k">Descripción breve de la tarea o requerimiento</div><div class="v">${esc(rec.tareaDescripcion || "—")}</div></div>
        <div class="full"><div class="k">Motivo por el cual se requiere la ${palabra}</div><div class="v">${esc(rec.motivoDesviacion || "—")}</div></div>
        <div class="full"><div class="k">Consecuencias potenciales</div><div class="v">${esc(rec.consecuenciasPotenciales || "—")}</div></div></div></div>

      ${rec.relacionadoSST ? `<div class="card" style="background:#fffaf0;border-color:#fde68a;margin-top:12px;"><h3>Detalle de Seguridad y Salud en el Trabajo (SST)</h3><div class="kv" style="margin:0;">
        <div class="full"><div class="k">Clase de peligro (GTC 45)</div><div class="v">${esc(rec.peligroSST || "—")}${rec.condicionSeguridad ? " · " + esc(rec.condicionSeguridad) : ""}</div></div>
        <div><div class="k">EPP adicional</div><div class="v">${esc(rec.eppAdicional || "—")}</div></div>
        <div><div class="k">Procedimientos alternativos</div><div class="v">${esc(rec.procedimientosAlternativos || "—")}</div></div>
        <div class="full"><div class="k">Compañero de apoyo</div><div class="v">${esc(rec.companeroApoyo || "—")}</div></div></div></div>` : ""}

      <div class="card" style="margin-top:12px;${enEval ? "border-color:#c4b5fd;" : ""}"><h3>Etapa 2 · Evaluación y Aprobación — Aprobador autorizado</h3>
        ${!puedeAprobar && enEval ? `<p class="hint" style="margin-top:-4px;">La diligencia el Aprobador autorizado.</p>` : ""}
        <div class="field"><label>Concepto de evaluación</label><textarea data-campo="conceptoEvaluacion" rows="2" ${puedeAprobar ? "" : "disabled"} placeholder="Viabilidad, riesgos y condiciones bajo las que se acepta la ${palabra}">${esc(rec.conceptoEvaluacion)}</textarea></div>
        <div class="field"><label>Medidas de control durante la ${palabra}</label><textarea data-campo="controlesCompensatorios" rows="2" ${puedeAprobar ? "" : "disabled"}>${esc(rec.controlesCompensatorios)}</textarea></div>
        <div class="field"><label>Observaciones de la aprobación (opcional)</label><textarea data-campo="observacionesAprobacion" rows="2" ${puedeAprobar ? "" : "disabled"} placeholder="Condiciones o recomendaciones de la aprobación">${esc(rec.observacionesAprobacion)}</textarea></div>
        <p class="hint" style="margin:0;">Los campos se guardan automáticamente; puede volver después a terminar.</p></div>

      ${rec.tipoGestion === "Derogación" ? `<div class="d8box" id="d8-section">
        <div class="d8box-head"><h3>${icon("link")} Reporte 8D (obligatorio en toda derogación)</h3><button type="button" class="btn btn-outline btn-sm" id="btnInstructivo8D">${icon("help")} ¿Cómo diligenciarlo?</button></div>
        ${!puede8D && enEval ? `<p class="hint" style="padding:0 15px 10px;">Lo diligencian el Responsable del proceso y el Aprobador autorizado durante la Evaluación y Aprobación.</p>` : ""}
        <div id="estado8D">${estado8D(rec)}</div>
        <div id="cajaD8">${d8HTML(rec.d8, {deshabilitado: !puede8D, personas: ctx.base.perfiles})}</div></div>`
        : `<div class="banner banner-slate" style="margin-top:16px;">${icon("link")} El reporte 8D no aplica: esta figura es una desviación. El 8D solo se activa en derogaciones.</div>`}

      <div class="card" style="margin-top:12px;${rec.stage === 2 && !cerrado ? "border-color:#86efac;" : ""}"><h3>Etapa 3 · Cierre — Responsable del proceso que hizo la solicitud</h3>
        ${!cerrado && rec.stage < 2 ? `<p class="hint" style="margin-top:-4px;">Se habilita cuando la solicitud está aprobada y la actividad ha finalizado.</p>` : ""}
        ${!cerrado && rec.stage === 2 && !dueno ? `<p class="hint" style="margin-top:-4px;">La cierra ${esc(rec.reportadoPor)}, quien hizo la solicitud.</p>` : ""}
        <div class="field"><label>Observaciones de cierre</label><textarea data-campo="observacionesCierre" rows="2" ${puedeCerrar ? "" : "disabled"} placeholder="Resultado de la actividad y estado final de la condición">${esc(rec.observacionesCierre)}</textarea></div>
        <div class="field" style="max-width:240px;"><label>¿Se cumplieron los controles?</label>
          <select data-campo="cumplimientoControl" ${puedeCerrar ? "" : "disabled"}><option value="">Sin definir</option>
            <option value="Sí" ${rec.cumplimientoControl === "Sí" ? "selected" : ""}>Sí</option><option value="No" ${rec.cumplimientoControl === "No" ? "selected" : ""}>No</option></select></div></div>

      <div class="card" style="margin-top:12px;"><h3>Evidencias adjuntas (${rec.adjuntos.length})</h3>
        <div id="listaAdjuntos">${adjuntosHTML(rec.adjuntos)}</div>
        ${!cerrado ? `<div class="type-add" style="align-items:center;"><input type="file" id="archivosNuevos" multiple style="flex:1;">
          <button type="button" class="btn btn-outline btn-sm" id="btnAdjuntar">${icon("clip")} Adjuntar</button></div>
          <div class="hint">Puede seleccionar varios archivos a la vez (máx. ${MAX_FILE_MB} MB cada uno, ${MAX_FILES_BATCH} por cargue). Las fotos se reducen automáticamente.</div>` : ""}</div>

      <div class="card" style="margin-top:12px;"><h3>Bitácora de seguimiento</h3>
        ${rec.bitacora.length === 0 ? `<p class="empty" style="padding:6px 0;">Sin movimientos registrados.</p>` : `<div class="bitacora">${rec.bitacora.slice().reverse().map(b => `<div class="bitacora-item">
          <div class="meta">${esc(b.fecha)} · ${esc(b.etapa)} · ${esc(b.rol)} (${esc(b.usuario)})</div><div class="txt">${esc(b.comentario)}</div></div>`).join("")}</div>`}</div>

      ${firmasHTML(ctx, rec)}
    </div></div></div>`;
}

export const estado8D = (rec) => is8DComplete(rec)
  ? `<div class="banner banner-green" style="margin:0 15px 10px;">${icon("check")} 8D completo.</div>`
  : `<div class="banner banner-amber" style="margin:0 15px 10px;">${icon("alert")} <span><b>8D incompleto</b> (requerido para aprobar la evaluación). Falta: ${d8Faltantes(rec.d8 || {}).map(esc).join("; ")}</span></div>`;

function alcanceHTML(rec){
  const def = rec.alcanceDerogacion === "Definitiva";
  return `<div class="full" style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:8px 10px;">
    <div class="k">Ajustar alcance de la derogación (se registra en la bitácora)</div>
    <div class="radio-line" style="margin-top:4px;">
      <label class="checkline" style="margin:0;"><input type="radio" name="alcEdit" value="Temporal" ${!def ? "checked" : ""}> Temporal</label>
      <label class="checkline" style="margin:0;"><input type="radio" name="alcEdit" value="Definitiva" ${def ? "checked" : ""}> Definitiva</label></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
      <div class="field" style="margin:0;"><label id="lblAlcIni">${def ? "Efectiva desde" : "Desde"}</label><input type="date" id="alcIni" value="${esc(def ? (rec.fechaEfectiva || rec.vigenciaInicio) : rec.vigenciaInicio)}"></div>
      <div class="field" style="margin:0;${def ? "display:none;" : ""}" id="alcFinCaja"><label>Hasta</label><input type="date" id="alcFin" value="${esc(rec.vigenciaFin)}"></div>
      <button type="button" class="btn btn-outline btn-sm" id="btnAlcance">${icon("check")} Guardar alcance</button></div></div>`;
}

function firmasHTML(ctx, rec){
  const cerrado = isClosed(rec), u = ctx.yo;
  const accion = {aprob: "Evaluar, aprobar y firmar", cierre: "Cerrar solicitud y firmar", admin: "Firmar visto bueno"};
  const casillas = FIRMA_SLOTS.map(sl => {
    const f = rec.firmas[sl.key], puede = canSignSlot(u, rec, sl), actual = sl.stage === rec.stage && !cerrado;
    let estado;
    if(f) estado = `${f.ruta ? `<img data-firma-ruta="${esc(f.ruta)}" alt="Firma de ${esc(f.nombre)}">` : ""}<div class="hint" style="margin-top:4px;">${icon("check")} ${esc(f.nombre)}${f.fecha ? " · " + esc(fmtFecha(f.fecha)) : ""}</div>`;
    else if(sl.key === "admin") estado = `<div class="hint">Opcional</div>`;
    else if(rec.resultado === "Rechazada") estado = `<div class="hint">No aplica (solicitud rechazada)</div>`;
    else if(rec.devuelta && sl.key === "sol") estado = `<div class="hint" style="color:#c2410c;font-weight:600;">Pendiente — se firma al reenviar la solicitud corregida</div>`;
    else if(actual) estado = `<div class="hint" style="color:#92400e;font-weight:600;">Pendiente — requerida para pasar a la siguiente etapa</div>`;
    else estado = `<div class="hint">Pendiente</div>`;
    if(!puede) return {sl, mia: false, html: `<div class="sign-slot" style="${actual && !f ? "border-color:#f59e0b;" : ""}"><div class="role">${esc(sl.label)}</div>${estado}</div>`};
    return {sl, mia: !f, html: `<div class="sign-slot mine"><div class="role">${esc(sl.label)} — <span style="color:var(--blue);">su firma</span></div>
      ${f ? `${estado}${sl.key === "admin" ? `<button type="button" class="btn btn-outline btn-sm" id="btnQuitarFirma" style="margin-top:8px;">${icon("undo")} Borrar mi firma</button>` : ""}` : `
        <div id="faltantesFirma" data-slot="${sl.key}"></div>
        <p class="hint" style="margin:0 0 6px;">Al firmar usted <b>aprueba la etapa ${esc(STAGES[sl.stage] || "")}</b> del registro ${esc(rec.id)}${sl.key === "cierre" ? " y la solicitud queda cerrada" : sl.key !== "admin" ? " y pasa a la siguiente etapa" : ""}. Dibuje su firma con el mouse o el dedo.</p>
        <canvas id="firmaCanvas" width="420" height="120" style="border:1px solid var(--border);border-radius:8px;background:#fff;touch-action:none;cursor:crosshair;max-width:100%;display:block;"></canvas>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-outline btn-sm" id="btnLimpiarFirma">${icon("x")} Limpiar</button>
          <button type="button" class="btn btn-primary btn-sm" id="btnFirmar" data-slot="${sl.key}">${icon("check")} ${esc(accion[sl.key] || "Firmar")}</button></div>`}</div>`};
  });
  const i = casillas.findIndex(c => c.mia);
  if(i > -1) casillas.unshift(...casillas.splice(i, 1));
  const requeridas = FIRMA_SLOTS.filter(sl => sl.key !== "admin");
  const firmadas = requeridas.filter(sl => rec.firmas[sl.key]).length;
  return `<div class="card" style="margin-top:16px;" id="firmas-section"><h3>Firmas de aprobación (${firmadas}/${requeridas.length})</h3>
    <p class="hint" style="margin:-4px 0 12px;">Responsable del proceso (solicitud) → Aprobador autorizado (evaluación y aprobación) → Responsable del proceso que hizo la solicitud (cierre). Solo se firma la etapa en curso.</p>
    <div class="sign-grid">${casillas.map(c => c.html).join("")}</div></div>`;
}
