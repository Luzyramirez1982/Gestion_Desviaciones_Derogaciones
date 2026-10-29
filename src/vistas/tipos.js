// Tipos de desviación o derogación por área: agregar, editar la descripción y quitar.
import { esc } from "../util/html.js";
import { icon } from "../componentes/iconos.js";
import { areaBadge } from "../componentes/insignias.js";

export function html(ctx){
  const { areas, tipos } = ctx.base;
  if(!areas.length) return `<div class="card"><p class="empty">Aún no hay áreas. Créelas en «Usuarios».</p></div>`;
  return areas.map(a => `<div class="card" style="margin-bottom:14px;">
    <h3>${areaBadge(a.nombre, areas)}</h3>
    <div>${tipos.filter(t => t.area === a.nombre).map(t => `<span class="chip" title="${esc(t.desc || "")}">${esc(t.nombre)}
      <button data-quitar-tipo="${esc(t.id)}" title="Quitar" aria-label="Quitar ${esc(t.nombre)}">${icon("x")}</button></span>`).join("") || `<span class="hint">Sin tipos todavía.</span>`}</div>
    <form class="type-add" data-agregar-tipo="${esc(a.nombre)}"><input type="text" placeholder="Agregar nuevo tipo de desviación…" required maxlength="150">
      <button class="btn btn-outline btn-sm" type="submit">${icon("plus")} Agregar</button></form></div>`).join("");
}

export function montar(ctx, el){
  const guardar = async (fn, ok) => { try { await fn(); await ctx.recargar(); ctx.ok(ok); ctx.render(); } catch(e){ ctx.error(e); } };
  el.querySelectorAll("[data-agregar-tipo]").forEach(f => f.addEventListener("submit", e => {
    e.preventDefault();
    const nombre = f.querySelector("input").value.trim();
    if(nombre) guardar(() => ctx.repo.guardarTipo({id: "t-" + crypto.randomUUID().slice(0, 8), area: f.dataset.agregarTipo, nombre, desc: ""}), "Tipo agregado.");
  }));
  el.querySelectorAll("[data-quitar-tipo]").forEach(b => b.addEventListener("click", () => guardar(() => ctx.repo.eliminarTipo(b.dataset.quitarTipo), "Tipo eliminado.")));
}
