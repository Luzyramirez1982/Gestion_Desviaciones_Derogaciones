// Panel de control: cifras, gráficos por etapa y figura, y vigencias próximas a vencer.
import { esc } from "../util/html.js";
import { STAGES, TIPOS_GESTION } from "../dominio/constantes.js";
import { STAGE_COLORS, TIPO_GESTION_COLORS } from "../dominio/presentacion.js";
import { isClosed } from "../dominio/registro.js";
import { daysUntil } from "../util/fechas.js";
import { kpiCard, barChart } from "../componentes/tarjetas.js";
import { icon } from "../componentes/iconos.js";

// Los borradores sin enviar no cuentan en las cifras.
export const enviados = (ctx) => ctx.registros.filter(r => !r.borrador);

export function html(ctx){
  const lista = enviados(ctx);
  const abiertos = lista.filter(r => !isClosed(r)).length;
  const derogaciones8D = lista.filter(r => r.tipoGestion === "Derogación" && !isClosed(r)).length;
  const porVencer = lista.filter(r => { const d = daysUntil(r.vigenciaFin); return !isClosed(r) && d !== null && d <= 7; });
  const porEtapa = STAGES.map((s, i) => ({name: s, total: lista.filter(r => r.stage === i && !r.devuelta).length, color: STAGE_COLORS[i]}));
  const porTipo = TIPOS_GESTION.map(t => ({name: t, total: lista.filter(r => r.tipoGestion === t).length, color: TIPO_GESTION_COLORS[t]}));
  return `
    <div class="grid kpis" style="margin-bottom:16px;">
      ${kpiCard("clip", "Registros totales", lista.length, "#f1f5f9", "#475569")}
      ${kpiCard("dashboard", "Registros abiertos", abiertos, "#dbeafe", "#1d4ed8")}
      ${kpiCard("alert", "Vigencias por vencer (≤7 días)", porVencer.length, "#fef3c7", "#92400e")}
      ${kpiCard("link", "Derogaciones con 8D abierto", derogaciones8D, "#fee2e2", "#b91c1c")}
    </div>
    <div class="grid two-col" style="grid-template-columns:1fr 1fr;margin-bottom:16px;">
      <div class="card"><h3>Registros por etapa del ciclo</h3>${barChart(porEtapa, Math.max(1, ...porEtapa.map(e => e.total)))}</div>
      <div class="card"><h3>Desviaciones vs. Derogaciones</h3>${barChart(porTipo, Math.max(1, ...porTipo.map(e => e.total)))}
        <p class="hint" style="margin-top:10px;">Solo las derogaciones activan el análisis 8D, según el procedimiento SST-pro-XX.</p></div>
    </div>
    <div class="card">
      <h3 style="display:flex;align-items:center;gap:7px;">${icon("alert")} Vigencias próximas a vencer</h3>
      ${porVencer.length === 0 ? `<p class="empty" style="padding:10px 0;">No hay vigencias próximas a vencer.</p>` : `<div class="list" style="border:none;">
        ${porVencer.map(r => { const d = daysUntil(r.vigenciaFin), urgente = d <= 2;
          return `<div class="row" data-abrir="${esc(r.id)}" style="border-left:3px solid ${urgente ? "#ef4444" : "#f59e0b"};"><div class="row-top">
            <div><div class="row-title">${esc(r.tipoEspecifico)}</div><div class="row-sub">${esc(r.id)} · ${esc(r.area)}</div></div>
            <span class="badge" style="background:${urgente ? "#fee2e2" : "#fef3c7"};color:${urgente ? "#b91c1c" : "#92400e"};">${d <= 0 ? "Vencida" : `Vence en ${d} día${d === 1 ? "" : "s"}`}</span></div></div>`; }).join("")}
      </div>`}
    </div>`;
}

export function montar(){}
