// Lista de archivos adjuntos de un registro (con opción de quitar los que aún no se han enviado).
import { esc } from "../util/html.js";
import { icon } from "./iconos.js";
import { fmtSize, fmtFecha } from "../util/formato.js";

export function adjuntosHTML(adjuntos, { vacio = "Sin archivos adjuntos.", quitable = false } = {}){
  if(!adjuntos || !adjuntos.length) return `<p class="hint" style="margin:4px 0;">${esc(vacio)}</p>`;
  return `<div class="adj-list">${adjuntos.map((a, i) => `<div class="adj-item">
    <span style="display:flex;align-items:center;gap:6px;min-width:0;">${icon("clip")}
      ${a.ruta ? `<a href="#" data-abrir-archivo="${esc(a.ruta)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(a.nombre)}</a>` : `<span>${esc(a.nombre)}</span>`}
      <span class="hint" style="white-space:nowrap;">${esc(fmtSize(a.tamano))}${a.usuario ? " · " + esc(a.usuario) : ""}${a.fecha ? " · " + esc(fmtFecha(a.fecha)) : ""}</span>
    </span>
    ${quitable ? `<button type="button" class="btn btn-danger-outline btn-sm" data-quitar-pendiente="${i}" title="Quitar">${icon("x")}</button>` : ""}
  </div>`).join("")}</div>`;
}
