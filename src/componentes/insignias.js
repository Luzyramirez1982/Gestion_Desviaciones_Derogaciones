// Etiquetas de colores (insignias) para etapa, figura, criticidad y área. Los colores salen de dominio/presentacion.js.
import { esc } from "../util/html.js";
import { STAGES, AREA_SST } from "../dominio/constantes.js";
import { STAGE_COLORS, AREA_PALETTE, TIPO_GESTION_COLORS, CRITICIDAD_INFO } from "../dominio/presentacion.js";

export const stageBadge = (stage) => { const c = STAGE_COLORS[stage] || STAGE_COLORS[0]; return `<span class="badge" style="background:${c.bg};color:${c.fg};"><span class="dot"></span>${esc(STAGES[stage])}</span>`; };
export const tipoGestionBadge = (t) => { const c = TIPO_GESTION_COLORS[t] || TIPO_GESTION_COLORS["Desviación"]; return `<span class="badge" style="background:${c.bg};color:${c.fg};">${esc(t)}</span>`; };
export const criticidadBadge = (cr) => { const i = CRITICIDAD_INFO[cr]; return i ? `<span class="badge" style="background:${i.bg};color:${i.fg};">${esc(cr)}</span>` : ""; };
export function areaBadge(area, areas = []){
  const i = areas.findIndex(a => a.nombre === area);
  const c = area === AREA_SST ? {bg: "#fee2e2", fg: "#b91c1c"} : AREA_PALETTE[(i < 0 ? 7 : i) % AREA_PALETTE.length];
  return `<span class="badge" style="background:${c.bg};color:${c.fg};">${esc(area)}</span>`;
}
