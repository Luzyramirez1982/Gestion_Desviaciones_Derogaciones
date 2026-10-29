// Piezas de pantalla que se repiten en todas las vistas: iconos, insignias, avisos y cuadros de diálogo.
import { esc } from "../util/html.js";
import { STAGES } from "../dominio/constantes.js";
import { STAGE_COLORS, AREA_PALETTE, TIPO_GESTION_COLORS, CRITICIDAD_INFO } from "../dominio/presentacion.js";
import { AREA_SST } from "../dominio/constantes.js";

export function icon(name){
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    plus: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    tag: '<path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.59a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 2-3 4"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    clip: '<path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.67 3.67 0 0 1 5.19 5.19L9.66 17.65a1.83 1.83 0 0 1-2.59-2.59l8.49-8.48"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    repeat: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    download: '<path d="M21 15v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    undo: '<path d="M3 7v6h6"/><path d="M3.51 13a9 9 0 1 0 2.13-9.36L3 7"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${paths[name]||""}</svg>`;
}

export function fmtSize(bytes){
  if(!bytes) return "";
  if(bytes < 1024) return bytes + " B";
  if(bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

// Fecha y hora de la base (UTC) como la ve la clienta, en hora de Colombia.
export function fmtFecha(iso){
  if(!iso) return "";
  const d = new Date(iso);
  if(isNaN(d)) return String(iso);
  return d.toLocaleString("es-CO", {dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota"});
}

export const stageBadge = (stage) => { const c = STAGE_COLORS[stage] || STAGE_COLORS[0]; return `<span class="badge" style="background:${c.bg};color:${c.fg};"><span class="dot"></span>${esc(STAGES[stage])}</span>`; };
export const tipoGestionBadge = (t) => { const c = TIPO_GESTION_COLORS[t] || TIPO_GESTION_COLORS["Desviación"]; return `<span class="badge" style="background:${c.bg};color:${c.fg};">${esc(t)}</span>`; };
export const criticidadBadge = (cr) => { const i = CRITICIDAD_INFO[cr]; return i ? `<span class="badge" style="background:${i.bg};color:${i.fg};">${esc(cr)}</span>` : ""; };
export function areaBadge(area, areas = []){
  const i = areas.findIndex(a => a.nombre === area);
  const c = area === AREA_SST ? {bg: "#fee2e2", fg: "#b91c1c"} : AREA_PALETTE[(i < 0 ? 7 : i) % AREA_PALETTE.length];
  return `<span class="badge" style="background:${c.bg};color:${c.fg};">${esc(area)}</span>`;
}

export const kpiCard = (ic, label, value, bg, fg) =>
  `<div class="card kpi"><div class="box" style="background:${bg};color:${fg};">${icon(ic)}</div><div><div class="val">${value}</div><div class="lbl">${esc(label)}</div></div></div>`;

export function barChart(data, max){
  return `<div style="display:flex;flex-direction:column;gap:9px;">${data.map(d => `<div>
    <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#475569;margin-bottom:3px;"><span>${esc(d.name)}</span><span style="font-weight:600;">${d.total}</span></div>
    <div style="background:#f1f5f9;border-radius:6px;height:9px;overflow:hidden;"><div style="width:${(d.total / max * 100).toFixed(0)}%;background:${d.color.fg};height:100%;border-radius:6px;"></div></div>
  </div>`).join("")}</div>`;
}

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

// Aviso flotante breve (éxito o error). Los de error se quedan más tiempo.
export function aviso(texto, tipo = "ok"){
  let caja = document.getElementById("avisos");
  if(!caja){
    caja = document.createElement("div");
    caja.id = "avisos";
    caja.setAttribute("role", "status");
    caja.setAttribute("aria-live", "polite");
    document.body.appendChild(caja);
  }
  const el = document.createElement("div");
  el.className = "aviso aviso-" + tipo;
  el.textContent = texto;
  caja.appendChild(el);
  setTimeout(() => el.remove(), tipo === "error" ? 9000 : 4000);
}

// Cuadro de diálogo propio (el del navegador se ve distinto en cada equipo). Devuelve una promesa.
function dialogo({ titulo, mensaje = "", campo = null, aceptar = "Aceptar", cancelar = "Cancelar", peligro = false }){
  return new Promise(resolve => {
    const fondo = document.createElement("div");
    fondo.className = "modal-fondo";
    fondo.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <h3>${esc(titulo)}</h3>
      ${mensaje ? `<p>${esc(mensaje)}</p>` : ""}
      ${campo ? `<textarea rows="3" placeholder="${esc(campo.placeholder || "")}"></textarea><div class="auth-msg err" style="display:none;margin-top:8px;"></div>` : ""}
      <div class="modal-botones">
        ${cancelar ? `<button type="button" class="btn btn-outline" data-no>${esc(cancelar)}</button>` : ""}
        <button type="button" class="btn ${peligro ? "btn-danger-outline" : "btn-primary"}" data-si>${esc(aceptar)}</button>
      </div></div>`;
    document.body.appendChild(fondo);
    const area = fondo.querySelector("textarea"), err = fondo.querySelector(".auth-msg");
    const cerrar = (v) => { fondo.remove(); resolve(v); };
    fondo.querySelector("[data-no]")?.addEventListener("click", () => cerrar(null));
    fondo.querySelector("[data-si]").addEventListener("click", () => {
      if(!campo) return cerrar(true);
      const t = area.value.trim();
      if(campo.minimo && t.length < campo.minimo){ err.textContent = campo.error || "Escriba el motivo."; err.style.display = "block"; return; }
      cerrar(t);
    });
    fondo.addEventListener("keydown", e => { if(e.key === "Escape") cerrar(null); });
    (area || fondo.querySelector("[data-si]")).focus();
  });
}
export const confirmar = (titulo, mensaje, opciones = {}) => dialogo({titulo, mensaje, ...opciones}).then(r => r === true);
export const pedirTexto = (titulo, mensaje, campo, opciones = {}) => dialogo({titulo, mensaje, campo, ...opciones});
export const informar = (titulo, mensaje) => dialogo({titulo, mensaje, cancelar: ""});
