// Uso del almacenamiento (solo Administrador): avisa al 70 % y al 90 % de los límites gratuitos.
import { esc } from "../util/html.js";
import { nivelUso, bytesLegibles, mensajeUso } from "../util/uso.js";
import { icon } from "../componentes/iconos.js";

const COLOR = {normal: "#15803d", aviso: "#d97706", alerta: "#b91c1c"};

const barra = (nombre, usado, limite) => {
  const {pct, nivel} = nivelUso(usado, limite);
  return `<div style="margin-bottom:18px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;">
      <b>${esc(nombre)}</b><span>${bytesLegibles(usado)} de ${bytesLegibles(limite)} (${pct.toFixed(1)} %)</span></div>
    <div class="barra-uso" role="progressbar" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%;background:${COLOR[nivel]};"></div></div>
    ${nivel !== "normal" ? `<div class="banner ${nivel === "alerta" ? "banner-red" : "banner-amber"}" style="margin-top:8px;">${icon("alert")} <span>${esc(mensajeUso(nombre, nivel))}</span></div>` : ""}</div>`;
};

export function html(ctx){
  const u = ctx.uso;
  return `<div class="card" style="max-width:720px;"><h3>${icon("db")} Uso del almacenamiento</h3>
    <p class="hint" style="margin:-4px 0 12px;">La aplicación usa los planes gratuitos de Supabase: 500 MB de base de datos y 1 GB de archivos. Aquí se ve cuánto queda.</p>
    ${!u ? `<p class="empty">Consultando…</p>` : `${barra("Base de datos", u.base_datos_bytes, u.base_datos_limite_bytes)}${barra("Archivos (adjuntos y firmas)", u.archivos_bytes, u.archivos_limite_bytes)}
      <p class="hint">Registros guardados: <b>${u.registros}</b>. El tamaño de archivos suma solo los adjuntos; las firmas pesan muy poco.</p>`}
    ${ctx.usoError ? `<div class="banner banner-red">${icon("alert")} ${esc(ctx.usoError)}</div>` : ""}</div>`;
}

export function montar(ctx, el){
  if(ctx.usoCargado) return;
  ctx.usoCargado = true;
  ctx.repo.usoAlmacenamiento().then(u => { ctx.uso = u; ctx.usoError = ""; }, e => { ctx.usoError = e.message; })
    .finally(() => { ctx.usoCargado = false; if(ctx.vista === "almacenamiento" && el.isConnected) { el.innerHTML = html(ctx); } });
}
