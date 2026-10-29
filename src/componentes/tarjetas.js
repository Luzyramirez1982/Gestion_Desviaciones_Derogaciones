// Tarjeta con una cifra y gráfico de barras del panel de control.
import { esc } from "../util/html.js";
import { icon } from "./iconos.js";

export const kpiCard = (ic, label, value, bg, fg) =>
  `<div class="card kpi"><div class="box" style="background:${bg};color:${fg};">${icon(ic)}</div><div><div class="val">${value}</div><div class="lbl">${esc(label)}</div></div></div>`;

export function barChart(data, max){
  return `<div style="display:flex;flex-direction:column;gap:9px;">${data.map(d => `<div>
    <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#475569;margin-bottom:3px;"><span>${esc(d.name)}</span><span style="font-weight:600;">${d.total}</span></div>
    <div style="background:#f1f5f9;border-radius:6px;height:9px;overflow:hidden;"><div style="width:${(d.total / max * 100).toFixed(0)}%;background:${d.color.fg};height:100%;border-radius:6px;"></div></div>
  </div>`).join("")}</div>`;
}
