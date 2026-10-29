// Registros eliminados: la huella (quién, cuándo y por qué) y la opción de restaurar. La huella no se borra.
import { esc } from "../util/html.js";
import { icon } from "../componentes/iconos.js";
import { fmtFecha } from "../util/formato.js";
import { confirmar } from "../componentes/dialogos.js";

export function html(ctx){
  const lista = ctx.eliminados;
  return `<div class="card"><h3>${icon("trash")} Registros eliminados (${lista.length})</h3>
    <p class="hint" style="margin:-4px 0 10px;">Cada eliminación hecha por un Administrador deja constancia de quién la hizo, cuándo, el motivo y una copia del registro. Esta huella no se puede borrar desde la aplicación.</p>
    ${lista.length ? `<div style="overflow-x:auto;"><table class="simple">
      <thead><tr><th>Fecha</th><th>Registro</th><th>Eliminado por</th><th>Motivo</th><th style="text-align:right;">Acciones</th></tr></thead>
      <tbody>${lista.map(h => { const r = (h.copia && h.copia.registro) || h.copia || {}; return `<tr>
        <td style="white-space:nowrap;">${esc(fmtFecha(h.fecha))}</td>
        <td><b>${esc(h.registroId)}</b> · ${esc(r.tipo_gestion || r.tipoGestion || "")}<br><span class="hint">${esc((r.data && r.data.tipoEspecifico) || r.tipoEspecifico || "")} · ${esc(r.area || "")}</span></td>
        <td>${esc(h.eliminadoPor)}<br><span class="hint">${esc(h.rol)} · ${esc(h.correo)}</span></td>
        <td>${esc(h.motivo)}${h.restaurado ? `<br><span class="badge" style="background:#dcfce7;color:#15803d;">Restaurado por ${esc(h.restauradoPor)} el ${esc(fmtFecha(h.restauradoEn))}</span>` : ""}</td>
        <td style="text-align:right;white-space:nowrap;">${h.restaurado ? "" : `<button class="btn btn-outline btn-sm" data-restaurar="${esc(h.id)}">${icon("repeat")} Restaurar</button>`}</td></tr>`; }).join("")}</tbody></table></div>`
      : `<p class="empty">No se han eliminado registros.</p>`}</div>`;
}

export function montar(ctx, el){
  el.querySelectorAll("[data-restaurar]").forEach(b => b.addEventListener("click", async () => {
    const h = ctx.eliminados.find(x => x.id === b.dataset.restaurar);
    if(!await confirmar("Restaurar registro", `Se vuelve a crear ${h.registroId} con su bitácora, firmas y adjuntos tal como estaban.`, {aceptar: "Restaurar"})) return;
    try { await ctx.repo.restaurarRegistro(h.id); await ctx.recargar(); ctx.ok(`${h.registroId} restaurado.`); ctx.render(); } catch(e){ ctx.error(e); }
  }));
}
