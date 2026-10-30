// Lista de registros con búsqueda, filtros por área, figura y etapa, y paginación.
import { esc } from "../util/html.js";
import { STAGES, TIPOS_GESTION } from "../dominio/constantes.js";
import { isClosed } from "../dominio/registro.js";
import { icon } from "../componentes/iconos.js";
import { stageBadge } from "../componentes/insignias.js";

const POR_PAGINA = 20;

export function filtrar(ctx){
  const f = ctx.filtros, q = f.busqueda.trim().toLowerCase();
  return ctx.registros.filter(r => {
    if(r.borrador && !r.devuelta) return false;      // los borradores se terminan en "Nuevo registro"
    if(f.area !== "Todas" && r.area !== f.area) return false;
    if(f.tipo !== "Todos" && r.tipoGestion !== f.tipo) return false;
    if(f.etapa !== "Todas" && STAGES[r.stage] !== f.etapa) return false;
    if(q && !`${r.id} ${r.tipoEspecifico || ""} ${r.reportadoPor || ""} ${r.motivoDesviacion || ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function html(ctx){
  const f = ctx.filtros, todos = filtrar(ctx);
  const paginas = Math.max(1, Math.ceil(todos.length / POR_PAGINA));
  f.pagina = Math.min(Math.max(1, f.pagina), paginas);
  const lista = todos.slice((f.pagina - 1) * POR_PAGINA, f.pagina * POR_PAGINA);
  const opciones = (valores, actual) => valores.map(v => `<option ${v === actual ? "selected" : ""}>${esc(v)}</option>`).join("");
  const nBor = ctx.misBorradores().length;
  return `
    <div class="toolbar">
      <div class="search-wrap">${icon("search")}<input type="text" id="busqueda" placeholder="Buscar por ID, tipo, responsable…" value="${esc(f.busqueda)}"></div>
      <select id="fArea"><option ${f.area === "Todas" ? "selected" : ""}>Todas</option>${opciones(ctx.nombresAreas(), f.area)}</select>
      <select id="fTipo"><option ${f.tipo === "Todos" ? "selected" : ""}>Todos</option>${opciones(TIPOS_GESTION, f.tipo)}</select>
      <select id="fEtapa"><option ${f.etapa === "Todas" ? "selected" : ""}>Todas</option>${opciones(STAGES, f.etapa)}</select>
      <button class="btn btn-outline btn-sm" id="btnExcel" title="Descarga todos los registros que usted puede consultar">${icon("download")} Descargar histórico (Excel)</button>
    </div>
    ${nBor ? `<div class="banner banner-amber">${icon("clip")} <span>Tiene <b>${nBor}</b> solicitud(es) en borrador o devueltas para ajustes. Termínelas en <a href="#/nuevo" style="font-weight:700;">Nuevo registro</a>.</span></div>` : ""}
    <div class="list">
      ${lista.length === 0 ? `<div class="empty">No hay registros que coincidan con los filtros.</div>` : lista.map(r => `
        <div class="row" data-abrir="${esc(r.id)}"><div class="row-top">
          <div><div class="row-title">${esc(r.tipoEspecifico || r.tipoGestion)}</div><div class="row-sub">${esc(r.id)} · Responsable: ${esc(r.reportadoPor)}</div></div>${icon("chevronRight")}</div>
          <div class="row-badges">
            ${r.devuelta ? `<span class="badge" style="background:#ffedd5;color:#c2410c;">Devuelta para ajustes</span>` : stageBadge(r.stage)}
            ${isClosed(r) && r.resultado !== "Rechazada" ? `<span class="badge" style="background:#dcfce7;color:#15803d;">${icon("check")} Cerrada</span>` : ""}
            ${r.resultado === "Rechazada" ? `<span class="badge" style="background:#fee2e2;color:#b91c1c;">Rechazada</span>` : ""}
            ${r.tipoGestion === "Derogación" ? `<span class="badge badge-8d">${icon("link")} 8D</span>` : ""}
          </div></div>`).join("")}
    </div>
    ${paginas > 1 ? `<div class="paginas"><button class="btn btn-outline btn-sm" data-pag="-1" ${f.pagina <= 1 ? "disabled" : ""}>Anterior</button>
      <span>Página ${f.pagina} de ${paginas} · ${todos.length} registros</span>
      <button class="btn btn-outline btn-sm" data-pag="1" ${f.pagina >= paginas ? "disabled" : ""}>Siguiente</button></div>` : ""}`;
}

export function montar(ctx, el){
  const f = ctx.filtros;
  const repintar = () => { el.innerHTML = html(ctx); montar(ctx, el); el.querySelectorAll("[data-abrir]").forEach(x => x.addEventListener("click", () => ctx.ir("registros/" + x.dataset.abrir))); };
  const caja = el.querySelector("#busqueda");
  caja.addEventListener("input", () => { f.busqueda = caja.value; f.pagina = 1; const pos = caja.selectionStart; repintar(); const n = el.querySelector("#busqueda"); n.focus(); n.setSelectionRange(pos, pos); });
  [["#fArea", "area"], ["#fTipo", "tipo"], ["#fEtapa", "etapa"]].forEach(([sel, clave]) =>
    el.querySelector(sel).addEventListener("change", e => { f[clave] = e.target.value; f.pagina = 1; repintar(); }));
  el.querySelectorAll("[data-pag]").forEach(b => b.addEventListener("click", () => { f.pagina += Number(b.dataset.pag); repintar(); }));
  el.querySelector("#btnExcel").addEventListener("click", async () => {
    try { const { descargarExcel } = await import("../exportar/descargas.js"); await descargarExcel(ctx); } catch(e){ ctx.error(e); }
  });
}
